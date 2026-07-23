# Foundry VTT 14 smoke checklist

- Install L5R5e 1.14.105 and this module from its stable manifest URL.
- On square and hex scenes, hover a readied weapon on the actor sheet and in Argon; confirm active-grip
  minimum shading and maximum boundary.
- Change the weapon grip and repeat; verify the old boundary is not reused.
- Hover a weapon item macro and a technique with an explicit or frozen range.
- Measure between tokens and confirm the label starts with `Range N`.
- Verify Range 0 remains possible for tokens sharing a space.
- Repeat on difficult/impassable layouts and confirm Tactical Grid only visualizes the core measurement.
- On a gridless scene, confirm there are no discrete-cell highlights and the label identifies the estimate.
- Enable square-soft and circle-soft grid masks and confirm both images load without a browser 404.
- Repeat one visibility and range check with a GM and player client.
