(function (exports) {
  "use strict";

  function $(sel, el) {
    return (el || document).querySelector(sel);
  }

  /*
  function $$(sel, el) {
    return (el || document).querySelectorAll(sel);
  }
  */

  let QRCode = window.QRCode;

  let DashDayPass = {};
  DashDayPass.protectedContent = {};

  DashDayPass._msDay = 24 * 60 * 60 * 1000;
  DashDayPass._satoshis = 100 * 1000 * 1000;
  DashDayPass._toSatoshis = function (value) {
    return Math.round(parseFloat(value) * DashDayPass._satoshis);
  };

  DashDayPass.init = async function ({ address, plans }) {
    // TODO pro-rate payments that are between plans
    if (!plans) {
      plans = [
        {
          amount: 0.0001,
          duration: 24 * 60 * 60 * 1000,
          qrSrc:null, // QRcode with default payment amount for this tier
          address:address,
        },
        {
          amount: 0.001,
          duration: 10*24 * 60 * 60 * 1000,
          qrSrc: null, // QRcode with default payment amount for this tier
          address:address,
        },
      ];
    }
    DashDayPass._randomize({ address, plans });

    DashDayPass._address = address;
    // Which address?
    console.log("address", address);

    DashDayPass._initStorage();

    /*
    localStorage.setItem('dash-daypass-tx', JSON.stringify({
      id: 'fdf77315af837dc8d7294d5f6e66174a95cbb470ffd5e0e346532bfda87bff9c'
    }));
    */

    let isPaid = await DashDayPass._checkPass({ plans, address });
    if (!isPaid) {
      DashDayPass._listenTxLock({ address, plans });
      onDomReady(function () {
        DashDayPass.addPaywall({ address, plans });
      });
    }
  };

  DashDayPass._randomize = async function ({ address, plans }) {
    plans.forEach(function (plan) {
      let amount = plan.amount;//plans[0].amount;
      let leeway = amount * (plans[0].leeway || 0.1);

      let fingerprint = Math.random() * leeway;
      amount -= fingerprint;

      // TODO check both
      plan.lastFingerprint = plan.fingerprint;
      plan.lastFingerprintSatoshis = plan.fingerprintSatoshis;
      plan.fingerprint = amount.toFixed(8);
      console.log('fingerprint',plan.fingerprint)
      plan.fingerprintSatoshis = DashDayPass._toSatoshis(plan.fingerprint);
      console.log("DEBUG satoshis:", plan.fingerprintSatoshis);

      plan.dashUri = `dash:${address}?amount=${plan.fingerprint}`;
      plan.svg = new QRCode({
        content: plan.dashUri,
        padding: 4,
        width: 256,
        height: 256,
        color: "#000000",
        background: "#ffffff",
        ecl: "M",
      }).svg();
    });
    console.log("DEBUG plans:", plans);
  };

  DashDayPass._storage = null;

  DashDayPass._initStorage = function () {
    try {
      localStorage.getItem("doesntexist");
      DashDayPass._storage = localStorage;
    } catch (e) {
      try {
        sessionStorage.getItem("doesntexist");
        DashDayPass._storage = sessionStorage;
      } catch (e) {
        // ignore
      }
      DashDayPass._storageWarning =
        "We can't track your payment in private browser mode";
    }
  };

  DashDayPass._checkPass = async function ({ address, plans }) {
    let tx = DashDayPass._getTxToken();
    if (!tx) {
      return;
    }

    let txData = await DashDayPass._getTxData(tx, address);

    let isValid = plans.some(function (plan) {
      return DashDayPass._paymentSatisfiesPlan(plan, txData);
    });
    if (!isValid) {
      console.log(
        `DEBUG: tx token is expired or does not meet minimum payment requirements`
      );
    }

    return isValid;
  };

  DashDayPass._getTxToken = function () {
    let db = DashDayPass._storage;
    if (!db) {
      console.log(`DEBUG: no storage`);
      return;
    }

    let txJson = db.getItem("dash-daypass-tx") || null;

    let tx;
    try {
      tx = JSON.parse(txJson);
    } catch (e) {
      console.warn(`Invalid transaction: ${txJson}`);
    }

    if (!tx?.id) {
      console.log(`DEBUG: no tx.id`);
      return;
    }

    return tx;
  };

  DashDayPass._getTxData = async function (tx, address) {
    // check storage and request tx
    //window.fetch(`https://insight.dash.org/insight-api/txs?address=${address}&pageNum=0`);
    let resp = await window.fetch(
      `https://insight.dash.org/insight-api/tx/${tx.id}`
    );
    let txData = await resp.json();
    if (!txData?.time) {
      console.log(`DEBUG: no txData.time`);
      return;
    }

    // How much?
    //let satoshis = 1_000_000_00
    let spent = 0;
    txData.vout.forEach(function (vout) {
      let hasAddress = vout.scriptPubKey.addresses.includes(address);
      if (!hasAddress) {
        return;
      }

      let value = DashDayPass._toSatoshis(vout.value);
      spent += value;
    });
    console.log("spent", (spent / DashDayPass._satoshis).toFixed(8));

    // How old?
    let now = Date.now();
    let then = txData.time * 1000;
    let duration = now - then;
    console.log("how old?", duration);

    return {
      payment: spent,
      duration: duration,
    };
  };

  DashDayPass._paymentSatisfiesPlan = function (plan, txData) {
    let isAboveThreshold = txData.payment >= plan.amount;
    if (!isAboveThreshold) {
      return false;
    }

    let isExpired = txData.duration > plan.duration;
    if (isExpired) {
      return false;
    }

    return true;
  };

  DashDayPass._position = "";
  DashDayPass.addPaywall = function ({ address, plans }) {
    // DEV STYLING - better import?
    let cssUrl = 'dash-daypass.css';
    $('head').insertAdjacentHTML("beforeEnd", `<link rel="stylesheet" type="text/css" href="${cssUrl}">`);
    // END DEV STYLING

    // let $body = $("body");
    DashDayPass.protectedContent =  $("dash-daypass-protect");
    let _protectedContent = DashDayPass.protectedContent;

    // DashDayPass._position = $body.style.position;
    // $body.style.position = "fixed";
    let plansHtmlStr = plans.map(function(plan){
      let durationDays = plan.duration / DashDayPass._msDay;
      let durationLabel = 'day';
      if(1 < durationDays){
        durationLabel+='s'
      }
      return `
      <div class="dash-paywall-plan">
        <strong>Đ${plan.amount} for ${durationDays} ${durationLabel}. *</strong>
        <fig class="dash-paywall_QR"> 
          ${plan.svg}
        </fig>
        <p>${plan.address}</p>
      </div>
      `
    }).join('');
    let paywallHTML = `
        <dash-daypass-paywall>
          <div class="dash-paywall-wrapper">
            <div class="dash-paywall_gradient"></div>
            <div class="dash-paywall">
              <p class="dash-paywall-center">Unlock this content for just:</p>
              <div class="dash-paywall-plans-container">
                ${plansHtmlStr}
              </div>
              <small class="dash-paywall-center">* all payments pro-rata above the minimum.</small>
            </div>
          </div>
        </dash-daypass-paywall>
			`
    _protectedContent.insertAdjacentHTML(
      'beforebegin',
      paywallHTML
    );
    _protectedContent.remove();
    console.log(_protectedContent);
  };

  DashDayPass.removePaywall = function () {
    // let $body = $("body");
    // $body.style.position = DashDayPass._position;
    // $(".js-paywall").remove();
    let paywallElement = $("dash-daypass-paywall")
    paywallElement.insertAdjacentHTML(
      'beforebegin',
      DashDayPass.protectedContent.innerHTML
    );
    paywallElement.remove()
  };

  DashDayPass._listenTxLock = async function ({ address, plans }) {
    let eventToListenTo = "txlock";
    let room = "inv";

    // TODO use WebSockets instead
    var socket = window.io("https://insight.dash.org/");
    socket.on("connect", function () {
      // Join the room.
      socket.emit("subscribe", room);
    });
    socket.on(eventToListenTo, function (data) {
      // TODO limit time to 5 minutes?
      console.log(`DEBUG: txlock`, data);
      // look for address

      /*
      {
        txid: "a920ba9fbf362f463fb2999aa4828909b9ba8564e7ac4911eb5471cca554d168",
        valueOut: 0.00500005,
        vout: [
          { XjAbAdPjKccAZAmBQ1iVwLG59QrLvaAQga: 100001 },
        ],
        isRBF: false,
        txlock: true,
      };
      */

      let txid = "";
      data.vout.some(function (vout) {
        return Object.keys(vout).some(function (addr) {
          if (addr !== address) {
            return false;
          }
          console.info("Found matching address:", addr);

          let payment = vout[addr];
          if (
            plans[0].fingerprintSatoshis !== payment &&
            plans[0].lastFingerprintSatoshis !== payment
          ) {
            return false;
          }
          console.info("Found matching payment:", payment);

          txid = data.txid;
          return true;
        });
      });

      if (!txid) {
        return;
      }

      let db = DashDayPass._storage;
      if (!db) {
        return;
      }

      db.setItem("dash-daypass-tx", JSON.stringify({ id: txid }));
      DashDayPass.removePaywall();
    });
  };

  function onDomReady(cb) {
    if (document.readyState === "loading") {
      // The document is still loading
      document.addEventListener("DOMContentLoaded", function (e) {
        cb();
      });
      return;
    }

    // The document is loaded completely
    cb();
  }

  exports.DashDayPass = DashDayPass;
})("undefined" === typeof module ? window : module.exports);
