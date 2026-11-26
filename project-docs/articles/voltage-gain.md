# Voltage gain in decibels

Voltage gain tells you how much an amplifier scales a signal. If a 10 mV input produces a 200 mV output, the voltage gain is 20.

To express that gain in decibels, use `20 × log10(|Vout / Vin|)`. A gain of 20 is about 26 dB. Doubling the output at the same input adds about 6 dB.

The [differential amplifier project](../amplifier-module.md) used 26 dB as its gain target at 1 MHz.
