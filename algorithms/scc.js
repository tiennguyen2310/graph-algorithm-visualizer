document.addEventListener('DOMContentLoaded', function() {
    // Basic setup for Cytoscape
    const cy = cytoscape({
        container: document.getElementById('cy-container'),
        style: [
            { selector: 'node', style: { 'background-color': '#666', 'label': 'data(id)' } },
            {
                selector: 'edge',
                style: {
                    'width': 3, 'line-color': '#ccc', 'target-arrow-color': '#ccc',
                    'target-arrow-shape': 'triangle', 'curve-style': 'bezier'
                }
            }
        ],
        layout: { name: 'grid' }
    });

    // Color palette for different SCCs
    const colors = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe'];

    document.getElementById('run-btn').addEventListener('click', () => {
        const graphText = document.getElementById('graph-input').value;
        const { nodes, edges, adj, revAdj } = parseGraph(graphText);
        
        // Clear previous graph and results
        cy.elements().remove();
        cy.add([...nodes.map(id => ({ data: { id } })), ...edges]);
        cy.layout({ name: 'cose', animate: true }).run();

        // Kosaraju's Algorithm
        const sccs = findSCCs(nodes, adj, revAdj);

        // Visualization
        sccs.forEach((component, index) => {
            const color = colors[index % colors.length];
            component.forEach(nodeId => {
                cy.getElementById(nodeId).style('background-color', color);
            });
        });
        
        // Display results
        document.getElementById('scc-count').textContent = sccs.length;
        const sccList = document.getElementById('scc-list');
        sccList.innerHTML = sccs.map((c, i) => `<p style="color:${colors[i % colors.length]}"><b>SCC ${i+1}:</b> {${c.join(', ')}}</p>`).join('');
    });

    function parseGraph(text) {
        const nodes = new Set();
        const edges = [];
        const adj = new Map();
        const revAdj = new Map();

        const lines = text.trim().split('\n');
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 2) return;
            const u = parts[0];
            const v = parts[1];
            
            nodes.add(u);
            nodes.add(v);

            if (!adj.has(u)) adj.set(u, []);
            if (!revAdj.has(v)) revAdj.set(v, []);
            adj.get(u).push(v);
            revAdj.get(v).push(u);

            edges.push({ data: { id: `${u}->${v}`, source: u, target: v } });
        });
        
        // Ensure all nodes are in adjacency lists
        nodes.forEach(node => {
            if (!adj.has(node)) adj.set(node, []);
            if (!revAdj.has(node)) revAdj.set(node, []);
        });

        return { nodes: Array.from(nodes), edges, adj, revAdj };
    }

    function findSCCs(nodes, adj, revAdj) {
        const visited = new Set();
        const order = [];

        // 1. First DFS on the reversed graph to get the finishing order
        function dfs1(u) {
            visited.add(u);
            for (const v of revAdj.get(u) || []) {
                if (!visited.has(v)) {
                    dfs1(v);
                }
            }
            order.push(u);
        }

        nodes.forEach(node => {
            if (!visited.has(node)) {
                dfs1(node);
            }
        });

        // 2. Second DFS on the original graph in the reversed finishing order
        visited.clear();
        const sccs = [];
        
        function dfs2(u, currentComponent) {
            visited.add(u);
            currentComponent.push(u);
            for (const v of adj.get(u) || []) {
                if (!visited.has(v)) {
                    dfs2(v, currentComponent);
                }
            }
        }

        while (order.length > 0) {
            const u = order.pop();
            if (!visited.has(u)) {
                const currentComponent = [];
                dfs2(u, currentComponent);
                sccs.push(currentComponent);
            }
        }
        return sccs;
    }
});