import math
import statistics


# sigma "shock" value
sigma = 2.5
# standard normal distribution
norm = statistics.NormalDist()
# 60 days max value
for i in range(0,60):
    tseconds = i*24*60*60
    tyears = i/365
    d_1 = .5*sigma*math.sqrt(tyears)
    # p(t) value
    p = norm.cdf(d_1) - norm.cdf(-d_1)
    # p(t) with 12 decimals
    # roundup (ceil) to get conservative estimate
    pscaled = math.ceil(p*10**12)
    print(tseconds, pscaled)

# need to output the ethers code to set values in the calculator
# for now i will hardcode in the constructor of the calculator
# need to output the calculator p-value unit tests
# can work additionaly on outputting the tests for getNakedMarginRequirements


