/* eslint-disable max-len */
/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as functions from "firebase-functions";
import {Client, TravelMode} from "@googlemaps/google-maps-services-js";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilio = require("twilio")(accountSid, authToken);

const OFFICE = "";
const HOME = "";

const home_to_office = "US-101 N";
const office_to_home = "US-101 S";

// How much extra time are we willing to take on the default route for convenience of not switching routes
const ALLOWED_EXTRA_TIME_MIN = -1;

const secToMin = (v:number) => v / 60.0;

const logError = (str:string) => {
  twilio.messages
      .create({
        body: str,
        from: "+19897189388", // twilio phone number
        to: "+14087173593",
      });
  throw new Error(str);
};

const calculateRoute = async (origin:string, destination:string, defaultRouteName: string) => {
  const client = new Client({});
  const directions = (await client.directions({
    params: {
      origin,
      destination,
      mode: TravelMode.driving,
      alternatives: true,
      key: "AIzaSyD-CwrLbOCnhdMtR2-csq5tBcCvSComIC8",
    }})).data;

  console.log(directions);

  // Route that takes the least amount of time first
  const sortedRoutes = directions.routes.map((route) => {
    return {name: route.summary, timeMin: secToMin(route.legs[0].duration.value)};
  }).sort((lhs, rhs) => lhs.timeMin - rhs.timeMin);
  console.log("sortedRoutes", sortedRoutes);

  if (sortedRoutes.length===1) {
    logError("Only one route is possible.");
  }

  const defaultRoute:any = sortedRoutes.find((obj) => obj.name === defaultRouteName);
  const defaultRouteTime = defaultRoute.timeMin;
  console.log("defaultRouteTime", defaultRouteTime);

  if (defaultRouteTime > sortedRoutes[0].timeMin + ALLOWED_EXTRA_TIME_MIN) {
    const timeSaved = defaultRouteTime - sortedRoutes[0].timeMin;
    const txtMsg = `Alternative route ${sortedRoutes[0].name} is ${timeSaved} min faster. \n\n` +
    `${JSON.stringify(sortedRoutes, null, 2)}`;


    console.log(txtMsg);

    twilio.messages
        .create({
          body: txtMsg,
          from: "+19897189388", // twilio phone number
          to: "+14087173593",
        });
  }
};

// export const helloWorld = functions.https.onRequest((request, response) => {
//   // functions.logger.info("Hello logs!", {structuredData: true});
//   calculateRoute(HOME, OFFICE, home_to_office);
//   response.send("Hello!");
// });

// exports.homeTofOffice = functions.pubsub.schedule("every 60 minutes from 9:30 to 10:00")
// 9:20 + 60min inerval, m-f
exports.homeTofOffice = functions.pubsub.schedule("20/40 9-10 * * 1-5")
// exports.homeTofOffice = functions.pubsub.schedule("*/60 9-10 * * 1-5")
    .timeZone("America/Los_Angeles")
    .onRun((context) => {
      calculateRoute(HOME, OFFICE, home_to_office);
      return null;
    });

// exports.officeToHome = functions.pubsub.schedule("every 30 minutes from 18:30 to 20:00")
// exports.officeToHome = functions.pubsub.schedule("every 60 minutes from 18:30 to 19:00")
// exports.officeToHome = functions.pubsub.schedule("30/30 18-20 * * 1-5")
// 18:30 + 60min inerval, m-f
exports.officeToHome = functions.pubsub.schedule("30/40 18-19 * * 1-5")
    .timeZone("America/Los_Angeles")
    .onRun((context) => {
      calculateRoute(OFFICE, HOME, office_to_home);
      return null;
    });
