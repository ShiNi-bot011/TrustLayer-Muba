# Judge Q&A Talking Points (Shi Ni)

## 1. "Is the bond enough to cover losses?"
> "It prevents incremental loss, not historical stock loss — we don't claim otherwise."

**Details:** 
- The formula (`Required Bond = (Unredeemed revenue) × (100 − Health Score)%`) explicitly covers a *fraction* of the exposure based on risk. 
- It is a deterrent and a mitigation tool. Guaranteeing full 100% recovery would require full escrow, which healthy merchants will never adopt.

## 2. "Doesn't charging the SaaS platform reintroduce the conflict of interest?"
> "Non-delivery of webhook data past SLA is itself a negative signal — silence costs the platform, it doesn't help them."

**Details:**
- If Zenoti/Rezerv tries to suppress negative check-in data to artificially inflate a merchant's score, our 48h webhook SLA timer catches it. 
- Silence triggers a score drop (Reason Code 4: Disappearance/Data Stagnation), forcing a bond increase anyway.
