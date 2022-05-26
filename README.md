# Đash DayPass

A simple Đash PayWall for content sites.

See [daypass.duckdns.org/](https://daypass.duckdns.org/) for examples.

<kbd><img width="456" alt="Screen Shot 2022-04-14 at 12 14 20 AM" src="https://user-images.githubusercontent.com/122831/163325020-511136a9-14cf-4e68-a814-0fd57f9a2e74.png"></kbd>


|![Desktop - Light](https://user-images.githubusercontent.com/72463218/170392947-3daf9e2d-8e4f-48e3-aa37-878097f672e3.png)|![Desktop - Dark](https://user-images.githubusercontent.com/72463218/170393007-6986a738-0e1b-422f-b419-f4dd4baddee5.png)|![Mobile - Dark](https://user-images.githubusercontent.com/72463218/170393349-c2a07017-8d86-4afb-b67b-0d2f981275ee.png)|![Mobile - Light](https://user-images.githubusercontent.com/72463218/170393201-f803ba79-b302-4273-b768-7fd2747179a2.png)|
|---|---|---|---|
# Usage (in development)

Minimum setup:
At the top of your HTML file, within your `<head>` element:
```html
<script src="https://daypass.duckdns.org/dash-daypass.js"></script>
<script>
  DashDayPass.create({
    addresses: [
      "Xr55w6itzUwwQR3eAokwS7wAgqpsF5ACXi"
    ],
  });
</script>
```
At least one Dash Address is required.  See [the Dash documentation ](https://docs.dash.org/en/stable/wallets/dashcore/send-receive.html) if you're unsure about how to get these.

You must also indicate to DashDayPass which parts of your page you want to protect.
You can:
  1. wrap the content in a `<dash-daypass-protect>` element:
  ```html
  ...page titles and unprotected content
    <dash-daypass-protect>
        ...protected content
    </dash-daypass-protect>
  ...more of my unprotected content
  ```
  1. add the `dash-daypass-protect` class to an existing element:
  ```html
  ...page titles and unprotected content
    <div class="dash-daypass-protect">
        ...protected content
    </div>
  ...more of my unprotected content
  ```
  1. pass a [CSS Selector](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors) (such as `.my-protected-class`, `#my-protected-id`, or `my-html-tag`)to the DashDayPass.Create:
  ```html
  <html>
    <head>
      .....
      <script src="https://daypass.duckdns.org/dash-daypass.js"></script>
      <script>
        DashDayPass.create({
          addresses: [
            "Xr55w6itzUwwQR3eAokwS7wAgqpsF5ACXi"
          ],
          content: '.my-protected-class'
        });
      </script>
    </head>
    <body>
      ...page titles and unprotected content
      <div class="my-protected-class">
          ...protected content
      </div>
      ...more of my unprotected content
    </body>
  </html>
  ```

Optionally, you can define your own access plans.  DashDayPass comes with a default plan of Đ0.0001 for 24 hours access.  Defining your own plan(s) will replace the default plan.
The default is equivalent to:
```html
<script src="https://daypass.duckdns.org/dash-daypass.js"></script>
<script>
  DashDayPass.create({
    addresses: [
      "Xr55w6itzUwwQR3eAokwS7wAgqpsF5ACXi"
    ],
    plans: [
      {
        amount: 0.0001,
        duration: 24 * 60 * 60 * 1000,
      },
    ],
  });
</script>
```
Define your own with: 
[example](https://daypass.duckdns.org/multi-plan.html)
```html
<script src="https://daypass.duckdns.org/dash-daypass.js"></script>
<script>
  DashDayPass.create({
    addresses: [
      "Xr55w6itzUwwQR3eAokwS7wAgqpsF5ACXi"
    ],
    plans: [
      {
        amount: 0.0001,
        duration: 24 * 60 * 60 * 1000,
      },
      {
        amount: 0.0005,
        duration: 7 * 24 * 60 * 60,
      },
      {
        amount: 0.0010,
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
