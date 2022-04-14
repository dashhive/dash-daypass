# Đash DayPass

A simple Đash PayWall for content sites.

# Usage (in development)

```html
<script src="https://dashhive.github.io/dash-daypass/dash-daypass.js"></script>
<script>
  DashDayPass.create({
    address: "yYQj8okZv8wNBevFDQrDvUivLbKhAn74QP",
    passes: [
      {
        amount: "0.001",
        label: "24-Hour Access",
        duration: 24 * 60 * 60,
      },
      {
        amount: "0.005",
        label: "7-Day Pass",
        duration: 7 * 24 * 60 * 60,
      },
      {
        amount: "0.010",
        label: "30-Day Membership",
        duration: 30 * 24 * 60 * 60,
      },
    ],
  });
</script>
```

# Notes & References

- `txlock` is _InstantSend_
- Insight's API: https://github.com/dashevo/insight-api#example-usage
- Task: https://trello.com/c/S1MStQgD/196-dash-daypass
- Spec: https://docs.google.com/document/d/1ExkUP35zm_vDNb-moSOSdbsjDCo4wZkuT4ROOLx_tWA/edit#
