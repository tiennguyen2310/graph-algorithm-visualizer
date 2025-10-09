document.addEventListener('DOMContentLoaded', function() {
    let cy;
    let animationTimeout;

    function initializeCytoscape() {
        cy = cytoscape({
            container: document.getElementById('cy-container'),
            style: [ // All graph styling, including for animations, goes in here.
                {
                    selector: 'node',
                    style: {
                        'background-color': '#666',
                        'label': 'data(id)',
                        'color': 'white',
                        'text-halign': 'center',
                        'text-valign': 'center'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#ccc',
                        'target-arrow-shape': 'triangle',
                        'target-arrow-color': '#ccc',
                        'curve-style': 'bezier',
                        'label': 'data(weight)',
                        'font-size': '14px',
                        'color': '#111',
                        'text-background-opacity': 1,
                        'text-background-color': '#fff',
                        'text-background-padding': 3
                    }
                },
                // --- CORRECTED STYLES MOVED HERE FROM CSS FILE ---
                {
                    selector: '.processing',
                    style: {
                        'background-color': '#4363d8', // Changed from border to background for nodes
                        'transition-property': 'background-color',
                        'transition-duration': '0.3s'
                    }
                },
                {
                    selector: '.visited',
                    style: {
                        'background-color': '#f58231',
                        'transition-property': 'background-color',
                        'transition-duration': '0.5s'
                    }
                },
                {
                    selector: '.path',
                    style: {
                        'line-color': '#3cb44b',
                        'target-arrow-color': '#3cb44b',
                        'width': 5,
                        'transition-property': 'line-color, target-arrow-color, width',
                        'transition-duration': '0.5s'
                    }
                }
            ]
        });
    }

    initializeCytoscape();

    document.getElementById('run-btn').addEventListener('click', () => {
        clearTimeout(animationTimeout);
        document.getElementById('distances-list').innerHTML = '';

        // Reset styles on all elements before a new run
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
        animateAlgorithm(animationSteps, () => displayDistances(distances, startNode));
    });

    function parseGraph(text, isDirected) {
        const adj = new Map();
        const nodes = new Set();
        const edges = [];
        const edgeSet = new Set(); // To avoid duplicate edges for undirected graphs

        const lines = text.trim().split('\n');
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length < 3) return;
            const u = parts[0], v = parts[1], weight = parseInt(parts[2]);
            if (isNaN(weight)) return;

            nodes.add(u);
            nodes.add(v);

            // Add to adjacency list
            if (!adj.has(u)) adj.set(u, []);
            adj.get(u).push({ node: v, weight });
            
            // Add edge for drawing
            const edgeId = `${u}->${v}`;
            if (!edgeSet.has(edgeId)) {
                 edges.push({ data: { id: edgeId, source: u, target: v, weight } });
                 edgeSet.add(edgeId);
            }

            if (!isDirected) {
                if (!adj.has(v)) adj.set(v, []);
                adj.get(v).push({ node: u, weight });
                
                // Add reverse edge for drawing if it doesn't exist
                const reverseEdgeId = `${v}->${u}`;
                 if (!edgeSet.has(reverseEdgeId)) {
                    edges.push({ data: { id: reverseEdgeId, source: v, target: u, weight } });
                    edgeSet.add(reverseEdgeId);
                }
            }
        });

        // Ensure all nodes are in the adjacency list map
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

        // Initialize distances
        for (const node of adj.keys()) {
            distances[node] = Infinity;
        }
        distances[startNode] = 0;

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

            if (u === null) break; // Should not happen in a connected component

            animationSteps.push({ type: 'process', node: u });

            (adj.get(u) || []).forEach(({ node: v, weight }) => {
                if (distances[u] + weight < distances[v]) {
                    distances[v] = distances[u] + weight;
                    predecessors[v] = u;
                    pq.add(v);
                    animationSteps.push({ type: 'pathUpdate', from: u, to: v, predecessor: predecessors });
                }
            });
             animationSteps.push({ type: 'finish', node: u });
        }
        return { distances, animationSteps };
    }

    function animateAlgorithm(steps, callback) {
        let i = 0;
        const speed = 800;
        
        // Reset styles for the animation
        cy.elements('.path').removeClass('path');
        const startNode = steps.length > 0 ? steps[0].node : null;


        function nextStep() {
            if (i >= steps.length) {
                cy.elements().removeClass('processing');
                if (callback) callback();
                return;
            }

            const step = steps[i];
            
            if (step.type === 'process') {
                cy.elements().removeClass('processing');
                cy.getElementById(step.node).addClass('processing');
            } else if (step.type === 'pathUpdate') {
                // To show the entire path tree, we trace back from the updated node
                cy.elements('.path').removeClass('path'); // Clear previous paths
                const pred = step.predecessor;
                for(const node in pred) {
                    const fromNode = pred[node];
                    const toNode = node;
                    
                    // Highlight edge and node
                    cy.getElementById(toNode).addClass('path');
                    cy.edges(`[source = "${fromNode}"][target = "${toNode}"]`).addClass('path');
                    cy.edges(`[source = "${toNode}"][target = "${fromNode}"]`).addClass('path');
                }
                 if(startNode) cy.getElementById(startNode).addClass('path'); // Always color start node

            } else if (step.type === 'finish') {
                cy.getElementById(step.node).removeClass('processing').addClass('visited');
            }

            i++;
            animationTimeout = setTimeout(nextStep, speed);
        }

        nextStep();
    }

    function displayDistances(distances, startNode) {
        const list = document.getElementById('distances-list');
        list.innerHTML = '';
        for (const node in distances) {
            const dist = distances[node] === Infinity ? '∞' : distances[node];
            const p = document.createElement('p');
            p.innerHTML = `Distance from <b>${startNode}</b> to <b>${node}</b> is <b>${dist}</b>`;
            list.appendChild(p);
        }
    }
});