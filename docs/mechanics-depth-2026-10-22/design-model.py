"""Design-only counterfactuals. Not a combat simulator or balance/retention evidence."""
import json, math, random
from collections import Counter

def scheduler(fair):
    cooldowns = [1.04, 1.68, 1.28, 3.2, 2, 2.4, 1.44, 1.36, 2.2]
    ready = [0.] * len(cooldowns)
    counts = [0] * len(cooldowns)
    for tick in range(150):
        now = tick * .4
        available = [i for i in range(len(ready)) if ready[i] <= now + 1e-8]
        if not available:
            continue
        index = min(available, key=lambda i: (ready[i], i)) if fair else available[0]
        counts[index] += 1
        ready[index] = now + cooldowns[index]
    return counts

def quantile(values, fraction):
    return sorted(values)[math.ceil(len(values)*fraction)-1]

# One eligible cartridge roll, not one kill/minute; all values below are proposals.
rng = random.Random(2271)
p = 1/8
random_only = []
with_guarantee = []
for _ in range(100_000):
    count = 1
    while rng.random() >= p:
        count += 1
    random_only.append(count)
    with_guarantee.append(min(count, 8))

# Shared-ancestor/cause flags prevent descendants from generating more triggers.
roots = 100
queue = [('primary', i) for i in range(roots)]
seen = Counter()
while queue:
    kind, origin = queue.pop()
    seen[kind] += 1
    if kind == 'primary':
        queue.extend(('trigger', origin) for _ in range(4))

# Example of allocation choices; thresholds illustrative, not borrowed game values.
base = 100
increased = base*(1+.8+.6)
independent = base*(1+.8)*(1+.6)
res_40 = base*(1-.40)
res_20 = base*(1-.20)
result = {
 'scope': 'design-only toy models; not implemented, not a gameplay/retention forecast',
 'scheduler': {'first_ready': scheduler(False), 'oldest_ready': scheduler(True), 'shared_cast_seconds': .4, 'seconds': 60},
 'targeted_acquisition': {'probability_per_eligible_roll': p, 'samples':100_000,'seed':2271,
    'random_only': {str(q):quantile(random_only,q) for q in [.5,.9,.99]},
    'proposed_eight_roll_guarantee': {str(q):quantile(with_guarantee,q) for q in [.5,.9,.99]},
    'random_only_expected_rolls':1/p,'guarantee_expected_rolls':(1-(1-p)**8)/p},
 'trigger_policy': {'roots':roots,'counts':dict(seen),'max_children_per_primary':4,'descendants_generate_energy':False},
 'damage_examples': {'same_bucket_80_plus_60':increased,'independent_80_and_60':independent,
    'damage_against_40_resistance':res_40,'after_20_point_exposure':res_20,'relative_gain':res_20/res_40-1},
}
assert all(n>0 for n in result['scheduler']['oldest_ready'])
assert seen['trigger']==400
assert result['targeted_acquisition']['proposed_eight_roll_guarantee']['0.99']==8
print(json.dumps(result,ensure_ascii=False,indent=2))
