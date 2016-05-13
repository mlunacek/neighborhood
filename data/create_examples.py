import json
#from builder import Builder
import tdshub as hub

Builder = hub.gridlabd.Gridlabd


def build_examples(num_houses, subgraph_nodes=None):

    feeder = 'ieee_node13_std'
    if num_houses == 5:
        feeder = 'ieee_node4_std'

    test_dict = {'houses': {'number': num_houses},
                 'evs': {'number': num_houses},
                 'solar': {'number': num_houses},
                 'interval': '10min',
                 'feeder': feeder}

    b1 = Builder(test_dict)
    filename = "construct_{}.json".format(num_houses)
    b1.export_construct(filename)

build_examples(5)
build_examples(10)
build_examples(20)
build_examples(30)
build_examples(40)
