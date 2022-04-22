const msDay = 24 * 60 * 60 * 1000;

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

  let DashDayPass = {};

  // temp for dev
  let cssUrl = 'dash-daypass.css'
  $('head').insertAdjacentHTML("beforeEnd", `<link rel="stylesheet" type="text/css" href="${cssUrl}">`)

  DashDayPass.init = async function ({ address, plans }) {
    // TODO pro-rate payments that are between plans
    if (!plans) {
      plans = [
        {
          amount: 0.001,
          duration: 24 * 60 * 60 * 1000,
          qrSrc:null, // QRcode with default payment amount for this tier
          address:address,
        },
      ];
    }

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
    let satoshis = 100 * 1000 * 1000;
    let spent = 0;
    txData.vout.forEach(function (vout) {
      let hasAddress = vout.scriptPubKey.addresses.includes(address);
      if (!hasAddress) {
        return;
      }

      let value = Math.round(parseFloat(vout.value) * satoshis);
      spent += value;
    });
    console.log("spent", (spent / satoshis).toFixed(8));

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
    let $body = $("body");
    // let payment = plans[0].amount;
    DashDayPass._position = $body.style.position;
    $body.style.position = "fixed";
    let plansHtmlStr = plans.map(function(plan){
      let durationDays = plan.duration / msDay;
      let durationLabel = 'day';
      if(1 < durationDays){
        durationLabel+='s'
      }
      return `
      <div class="dash-paywall-plan">
        <strong>Đ${plan.amount} for ${durationDays} ${durationLabel}. *</strong>
        <img class="dash-paywall_QR" src="${plan.qrSrc}">
        <p>${plan.address}</p>
      </div>
      `
    }).join('');

    $body.insertAdjacentHTML(
      "beforeend",
      `
        <div class="dash-paywall-wrapper">
					<div class="dash-paywall_gradient"></div>
          <div
            class="dash-paywall"
          >
            <p class="dash-paywall-center">Unlock this content for just:</p>
            <div class="dash-paywall-plans-container">
              ${plansHtmlStr}
            </div>
            <small class="dash-paywall-center">* all payments pro-rata above the minimum.</small>
          </div>
        </div>
			`
    );
  };

  DashDayPass.removePaywall = function () {
    let $body = $("body");
    $body.style.position = DashDayPass._position;
    $(".dash-paywall-wrapper").remove();
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
      console.log(`DEBUG: txlock`, data);
      // look for address
      let txid = "";
      let spent = 0;

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
      data.vout.some(function (vout) {
        return Object.keys(vout).some(function (addr) {
          if (addr === address) {
            spent += vout[addr];
            return true;
          }
        });
      });

      if (!spent) {
        return;
      }

      let db = DashDayPass._storage;
      if (!db) {
        return;
      }

      db.setItem("dash-daypass-tx", { id: data.txid });
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
