# A code-controlled differential amplifier

This amplifier module combines a differential amplifier with a four-bit code checker. The checker enables the module when its input matches `1100`.

## Circuit design

The amplifier uses a current mirror and produces a single-ended output. NAND logic checks the input code, and transmission gates switch the module on or off. Simulations put the code checker's propagation delay at 348 ps, within the 500 ps limit.

## Simulated performance

The amplifier exceeded its 26 dB gain target at 1 MHz. It consumed 261.5 µW against a 500 µW budget and delivered 335 mV of peak-to-peak output swing against a 300 mV minimum.

[View the schematics, simulation plots, and layout in the project report (PDF)](../assets/Amplifier_Module/Amplifier_Module_FinalReport.pdf)
