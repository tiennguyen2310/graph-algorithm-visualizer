document.addEventListener('DOMContentLoaded', function() {
    // This function will run when the HTML is fully loaded

    // Placeholder for the Cytoscape instance
    let cy;

    const drawGraphBtn = document.getElementById('draw-graph-btn');
    const graphInput = document.getElementById('graph-input');
    const container = document.getElementById('cy-container');
    const instructions = document.getElementById('instructions');

    drawGraphBtn.addEventListener('click', () => {
        // Hide instructions when the graph is drawn
        if (instructions) {
            instructions.style.display = 'none';
        }

        // Initialize Cytoscape
        cy = cytoscape({
            container: container, // container to render in

            elements: [ // list of graph elements to start with
                // We will parse the user input to create elements here
                { data: { id: 'a' } },
                { data: { id: 'b' } },
                { data: { id: 'ab', source: 'a', target: 'b' } }
            ],

            style: [ // the stylesheet for the graph
                {
                    selector: 'node',
                    style: {
                        'background-color': '#666',
                        'label': 'data(id)'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 3,
                        'line-color': '#ccc',
                        'target-arrow-color': '#ccc',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier'
                    }
                }
            ],

            layout: {
                name: 'grid',
                rows: 1
            }
        });

        console.log("Graph drawing logic will go here!");
        // TODO: Parse text from `graphInput` and add nodes/edges to `cy`
    });

    // TODO: Add event listener for algorithm selection
});