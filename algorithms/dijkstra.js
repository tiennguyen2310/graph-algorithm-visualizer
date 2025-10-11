// algorithms/dijkstra.js (Corrected for Undirected Arrows)

document.addEventListener('DOMContentLoaded', function() {
    let cy;
    let animationTimeout;

    function initializeCytoscape() {
        cy = cytoscape({
            container: document.getElementById('cy-container'),
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#666', 'label': 'data(id)',
                        'color': 'white', 'text-halign': 'center', 'text-valign': 'center'
                    }
                },
                {
                    selector: 'edge', // Base style for ALL edges
                    style: {
                        'width': 2, 'line-color': '#ccc',
                        'target-arrow-shape': 'none',
                        'target-arrow-color': '#ccc', 'curve-style': 'bezier', 'label': 'data(weight)',
                        'font-size': '14px', 'color': '#111', 'text-background-opacity': 1,
                        'text-background-color': '#fff', 'text-background-padding': 3
                    }
                },
                {
                    selector: 'edge.directed',
                    style: {
                        'target-arrow-shape': 'triangle'
                    }
                },
                {
                    selector: '.processing',
                    style: { 'background-color': '#4363d8', 'transition-property': 'background-color', 'transition-duration': '0.3s' }
                },
                {
                    selector: '.visited',
                    style: { 'background-color': '#f58231', 'transition-property': 'background-color', 'transition-duration': '0.5s' }
                },
                {
                    selector: 'node.path',
                    style: { 'background-color': '#3cb44b', 'transition-property': 'background-color', 'transition-duration': '0.5s' }
                },
                {
                    selector: 'edge.path',
                    style: {
                        'line-color': '#3cb44b', 'target-arrow-color': '#3cb44b', 'width': 5,
                        'transition-property': 'line-color, target-arrow-color, width', 'transition-duration': '0.5s'
                    }
                }
            ]
        });
    }

    initializeCytoscape();

    document.getElementById('run-btn').addEventListener('click', () => {
        clearTimeout(animationTimeout);
        document.getElementById('distances-list').innerHTML = '';
        cy.elements().removeClass('processing visited path');

        const graphText = document.getElementById('graph-input').value;
        const startNode = document.getElementById('start-node').value.trim();
        const isDirected = document.getElementById('directed-checkbox').checked;

        if (!startNode) {
            alert("Please specify a start node.");
            return;
        }

        const { adj, nodes, edges } = parseGraph(graphText, isDirected);

        cy.elements().remove();
        cy.add([...nodes.map(id => ({ data: { id } })), ...edges]);
        cy.layout({ name: 'cose', padding: 50 }).run();
        
        if (!nodes.includes(startNode)) {
            alert("Start node not found in the graph input.");
            return;
        }
        
        const { distances, animationSteps } = dijkstra(adj, startNode);
        animateAlgorithm(animationSteps);
        displayDistances(distances, startNode);
    });

    function parseGraph(text, isDirected) {
        const adj = new Map();
        const nodes = new Set();
        const edges = [];

        const lines = text.trim().split('\n');
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 3) return;
            const u = parts[0], v = parts[1], weight = parseInt(parts[2]);
            if (isNaN(weight)) return;

            nodes.add(u);
            nodes.add(v);

            if (!adj.has(u)) adj.set(u, []);
            adj.get(u).push({ node: v, weight });
            
            // Add a 'directed' class to the edge object if the graph is directed
            const edgeObj = {
                data: { id: `${u}->${v}`, source: u, target: v, weight }
            };
            if (isDirected) {
                edgeObj.classes = 'directed';
            }
            edges.push(edgeObj);

            if (!isDirected) {
                if (!adj.has(v)) adj.set(v, []);
                adj.get(v).push({ node: u, weight });
            }
        });

        nodes.forEach(node => {
            if (!adj.has(node)) adj.set(node, []);
        });
        
        return { adj, nodes: Array.from(nodes), edges };
    }
    
    function dijkstra(adj, startNode) {
        const distances = {};
        const pq = new Set([startNode]);
        const predecessors = {};
        const animationSteps = [];

        for (const node of adj.keys()) {
            distances[node] = Infinity;
        }
        distances[startNode] = 0;
        animationSteps.push({ type: 'start', node: startNode });

        while (pq.size > 0) {
            let u = null;
            let minDistance = Infinity;
            pq.forEach(node => {
                if (distances[node] < minDistance) {
                    minDistance = distances[node];
                    u = node;
                }
            });
            pq.delete(u);

            if (u === null) break;

            animationSteps.push({ type: 'process', node: u });

            (adj.get(u) || []).forEach(({ node: v, weight }) => {
                if (distances[u] + weight < distances[v]) {
                    const oldDistance = distances[v];
                    distances[v] = distances[u] + weight;
                    predecessors[v] = u;
                    pq.add(v);
                    animationSteps.push({ type: 'pathUpdate', from: u, to: v, newDist: distances[v], oldDist: oldDistance });
                }
            });
            animationSteps.push({ type: 'finish', node: u });
        }
        
        animationSteps.push({ type: 'finalTree', start: startNode, predecessors });
        return { distances, animationSteps };
    }

    function animateAlgorithm(steps) {
        let i = 0;
        const speed = 700;

        function nextStep() {
            if (i >= steps.length) {
                cy.elements().removeClass('processing');
                return;
            }
            const step = steps[i];
            
            if (step.type === 'process') {
                cy.elements().removeClass('processing');
                cy.getElementById(step.node).addClass('processing');
            } else if (step.type === 'finish') {
                cy.getElementById(step.node).removeClass('processing').addClass('visited');
            } else if (step.type === 'start') {
                 cy.getElementById(step.node).addClass('visited');
            } else if (step.type === 'finalTree') {
                for (const node in step.predecessors) {
                    const predecessor = step.predecessors[node];
                    cy.getElementById(node).addClass('path');
                    cy.getElementById(predecessor).addClass('path');
                    cy.edges(`[source = "${predecessor}"][target = "${node}"]`).addClass('path');
                }
            }

            i++;
            animationTimeout = setTimeout(nextStep, speed);
        }
        nextStep();
    }

    function displayDistances(distances, startNode) {
        const list = document.getElementById('distances-list');
        list.innerHTML = '';
        const sortedNodes = Object.keys(distances).sort();

        for (const node of sortedNodes) {
            const dist = distances[node] === Infinity ? '∞' : distances[node];
            const p = document.createElement('p');
            p.innerHTML = `Distance from <b>${startNode}</b> to <b>${node}</b> is <b>${dist}</b>`;
            list.appendChild(p);
        }
    }
});