# Real-photo QA fixtures

These are test fixtures, not images shipped in the application.

- coffee.png: Rachel Michetti / Pikolo Espresso Bar, CC0.
- chelsea.png: Stefan van der Walt, CC0.
- astronaut.png: NASA portrait of Eileen Collins, public domain/no known copyright restrictions.

Source: https://github.com/scikit-image/scikit-image/tree/v0.20.0/skimage/data
Licence attribution: https://github.com/scikit-image/scikit-image/blob/v0.25.2/skimage/data/_fetchers.py (coffee, chelsea, astronaut functions).

- `coffee.heic` is an HEIF encoding of the existing CC0 coffee fixture, produced locally with macOS sips; it retains the original fixture attribution.
- `sensor.dng` is an original synthetic 128×96 Bayer sensor fixture authored for UnCanva tests, released under CC0. It is a valid DNG input to the real LibRaw decoder, not a substituted decoder output.
- `printer.icc` is LittleCMS's `testbed/test2.icc` from release lcms2.19.1 (MIT), used solely as a test transform profile, not a recommended production printer profile. Source: https://github.com/mm2/Little-CMS/blob/lcms2.19.1/testbed/test2.icc ; licence: https://github.com/mm2/Little-CMS/blob/lcms2.19.1/LICENSE .
- `srgb.icc` is saucecontrol/Compact-ICC-Profiles `profiles/sRGB-v4.icc` (CC0): https://github.com/saucecontrol/Compact-ICC-Profiles .
