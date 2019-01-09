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

best_of = 5
exclude = "sample_bot/ crusaderspam/"


excludelist = exclude.split(' ')

direc = sys.argv[1]
print(direc)
for x in glob.glob('*/'):
    if (x in excludelist) and os.path.isfile(x + 'robot.js'):
        # works
        print("Testing %s"%x)
        wins = 0
        for i in range(best_of):
            s = subprocess.check_output(["bc19run", "-r", direc, "-b", x]).strip().split('\n')[-1]
            if " red won " in s or "Blue failed to initialize":
                wins += 1
            elif (" blue won " not in s) and ("Red failed to initialize" not in s):
                print("weird error occurred: %s"%(s))

        print("bot %s won %d/%d games against %s."%(direc,wins,best_of,x))

