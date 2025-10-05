document.addEventListener('DOMContentLoaded', function() {
    let cy; // Make cy accessible to all functions in this scope

    function initializeCytoscape() {
        cy = cytoscape({
            container: document.getElementById('cy-container'),
            style: [
                { selector: 'node', style: { 'background-color': '#666', 'label': 'data(id)', 'color': 'white', 'text-halign': 'center', 'text-valign': 'center' } },
                {
                    selector: 'edge',
                    style: {
                        'width': 3, 'line-color': '#ccc', 'target-arrow-color': '#ccc',
                        'target-arrow-shape': 'triangle', 'curve-style': 'bezier',
                        'label': e => `${e.data('flow')} / ${e.data('capacity')}`,
                        'font-size': '14px',
                        'color': '#111',
                        'text-background-opacity': 1,
                        'text-background-color': '#fff',
                        'text-background-padding': 3,
                        'text-background-shape': 'round-rectangle'
                    }
                }
            ],
            layout: { name: 'grid' }
        });
    }
    
    initializeCytoscape(); // Initialize on page load

    document.getElementById('run-btn').addEventListener('click', () => {
        const graphText = document.getElementById('graph-input').value;
        const source = document.getElementById('source-node').value.trim();
        const sink = document.getElementById('sink-node').value.trim();
        
        if (!source || !sink) {
            alert("Please specify a source and a sink node.");
            return;
        }

        const { capacity, adj } = parseAndDrawGraph(graphText);
        
        // Check if source and sink exist in the graph
        if (!adj.has(source) || !adj.has(sink)) {
            alert("Source or Sink node not found in the graph input.");
            return;
        }

        // Edmonds-Karp Algorithm
        const maxFlow = edmondsKarp(source, sink, capacity, adj);

        // Visualization & Results
        document.getElementById('max-flow-result').textContent = maxFlow;
        cy.layout({ 
            name: 'cose', 
            animate: true,
            padding: 50,
            stop: () => {
                // Highlight source and sink after layout is done
                cy.getElementById(source).style({ 'background-color': '#3cb44b', 'width': 50, 'height': 50 });
                cy.getElementById(sink).style({ 'background-color': '#e6194b', 'width': 50, 'height': 50 });
            }
        }).run();
    });
    
    function parseAndDrawGraph(text) {
        const capacity = new Map(); // Key: 'u->v', Value: capacity
        const adj = new Map();
        const nodes = new Set();
        const edges = [];

        const lines = text.trim().split('\n');
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 3) return;
            const u = parts[0], v = parts[1], c = parseInt(parts[2]);

            if (isNaN(c)) return;

            nodes.add(u);
            nodes.add(v);

            if (!adj.has(u)) adj.set(u, new Set());
            if (!adj.has(v)) adj.set(v, new Set());
            adj.get(u).add(v);
            adj.get(v).add(u); // Add reverse connection for residual graph traversal

            capacity.set(`${u}->${v}`, c);
            edges.push({ data: { id: `${u}->${v}`, source: u, target: v, capacity: c, flow: 0 } });
        });

        // Re-initialize graph
        cy.elements().remove();
        cy.add([...Array.from(nodes).map(id => ({ data: { id } })), ...edges]);

        return { capacity, adj };
    }

    function edmondsKarp(s, t, capacity, adj) {
        const flowMap = new Map(); // Key: 'u->v', Value: current flow
        let maxFlow = 0;

        while (true) {
            // 1. Find an augmenting path using BFS on the residual graph
            const parent = new Map([[s, null]]); // To reconstruct the path
            const queue = [s];
            let pathFound = false;

            let head = 0;
            while (head < queue.length) {
                const u = queue[head++];
                if (u === t) {
                    pathFound = true;
                    break;
                }

                for (const v of adj.get(u)) {
                    // Calculate residual capacity from u to v
                    const residualCapacity = (capacity.get(`${u}->${v}`) || 0) - (flowMap.get(`${u}->${v}`) || 0);

                    if (!parent.has(v) && residualCapacity > 0) {
                        parent.set(v, u);
                        queue.push(v);
                    }
                }
            }

            // 2. If no path to the sink was found, we are done
            if (!pathFound) {
                break;
            }

            // 3. Calculate the path flow (the bottleneck capacity)
            let pathFlow = Infinity;
            for (let v = t; v !== s; v = parent.get(v)) {
                const u = parent.get(v);
                const residualCapacity = (capacity.get(`${u}->${v}`) || 0) - (flowMap.get(`${u}->${v}`) || 0);
                pathFlow = Math.min(pathFlow, residualCapacity);
            }

            // This should not happen if pathFound is true, but as a safeguard:
            if (!isFinite(pathFlow) || pathFlow <= 0) {
                break;
            }

            // 4. Update the flow on the path
            for (let v = t; v !== s; v = parent.get(v)) {
                const u = parent.get(v);
                const forwardEdge = `${u}->${v}`;
                const backwardEdge = `${v}->${u}`;

                // Add flow to forward edge, subtract from backward edge (handles residual graph)
                flowMap.set(forwardEdge, (flowMap.get(forwardEdge) || 0) + pathFlow);
                flowMap.set(backwardEdge, (flowMap.get(backwardEdge) || 0) - pathFlow);
            }

            maxFlow += pathFlow;
        }

        // Update Cytoscape visualization with the final flow
        cy.edges().forEach(edge => {
            const u = edge.source().id();
            const v = edge.target().id();
            const edgeFlow = flowMap.get(`${u}->${v}`) || 0;
            
            // Only show positive flow on the label for clarity
            const finalFlow = Math.max(0, edgeFlow);
            edge.data('flow', finalFlow);
            
            // Bonus: Make edges with flow more prominent
            if (finalFlow > 0) {
                edge.style({
                    'line-color': '#4363d8',
                    'target-arrow-color': '#4363d8',
                    'width': 2 + finalFlow / 2 // Make edge thicker based on flow
                });
            } else {
                 edge.style({
                    'line-color': '#ccc',
                    'target-arrow-color': '#ccc',
                    'width': 3
                });
            }
        });

        return maxFlow;
    }
});