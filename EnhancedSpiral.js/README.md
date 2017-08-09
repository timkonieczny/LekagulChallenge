DONE:

- found algorithms to calculate the length of the cycles in the data. Those are based mainly on Fourier Transform.
- thought to include also a local search algorithm like Dynamic Time Warping to look for local patterns and cycles in defined data regions. This should allow a fine tuning of the desired cycle length.
- found 5-6 datasets. One of them is artificial, and some measurements contain also noise, to simulate a non-perfect cycle alignment, and stress the algorithms.
- applied the algorithms to the datasets, and manually looked at the visualisations to test the results of the algorithms.
- adapted the tool so that now it is possible to switch between spiral plot and heat-map.
- surrounded the spiral with a glow that should become stronger when the proper cycle length is chosen.
- studied and listed different options to visualise the suggestions provided by the algorithms.
- started to integrate the tool with the back-end that should run the R scripts (algorithms)
- studied the literature regarding algorithms, periodical aspects of time series, and visual encoding of suggestions.
- Implemented the R server that can answer the requests of the web tool. At the moment the serve is only able to calculate cycles.
- Started to implement the guidance in the web tool. Added a new branch, called guidance, in which I started to modify the general spiral and included the new one to support the visual encoding of the suggestions.
  At the moment we offer guidance just for spotting the cycle length.


TODO:

- Add marks to slider (corresponding to the guidance output).
- Change the glow according to the distance from a suitable cycle length.


NEED A FURTHER DISCUSSION:

- Add the possibility to save a state of the visualization tool
- Include DTW (autocorrelation) in the tool for local cycles/pattern search.
- Include in the R-Server an implementation of "Sliding window" algorithm to improve the search for cycles.
- Define a color scheme for the glow/guidance suggestions in such a way that it does not interfere with the color scale used in the spiral.
- Pilot testing to test if the tool is usable/needed/valuable
        - Rethink/improve it based on the output of the pilo testing
- Design of a user-study/evaluation of the tool
    - Define generic Hypothesis
    - Define questions for the users
    - ....
- Write a nice paper :)
