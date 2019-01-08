import sys
import subprocess
import os
import glob
# TODO:
# - have bots output the size of the map and starting conditions at beginning
docstr = """Usage: framework.py foldername"""
if len(sys.argv) != 2:
    print(docstr)
    exit()

best_of = 1
exclude = "asdf asdfg"


excludelist = exclude.split(' ')

direc = sys.argv[1]
for x in glob.glob('*/'):
    if (x not in excludelist) and os.path.isfile(x + 'robot.js'):
        # works
        print("Testing %s"%x)
        wins = 0
        for i in range(best_of):
            s = subprocess.check_output(["bc19run", "-r", direc, "-b", x]).strip().split('\n')[-1]
            if " red " in s:
                wins += 1

        print("bot %s won %d/%d games against %s."%(direc,wins,best_of,x))

