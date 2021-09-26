import { Router } from "itty-router";
import { initSentry } from "./sentry";
import { parseDate } from "./utils";

/*async function handleCron(): Promise<unknown> {
  // if more, use Promise.all
  return vPlanCron();
}*/

const router = Router()
  .get("/stop/search", async (request) => {
    // @ts-ignore
    const { query, limit, stopsOnly, regionalOnly, stopShortcuts } =
      request.query;

    const response = await fetch(
      "https://webapi.vvo-online.de/tr/pointfinder",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          limit,
          stopsOnly: stopsOnly ?? true,
          regionalOnly: regionalOnly ?? true,
          stopShortcuts: stopShortcuts ?? false,
        }),
      }
    );

    const json = await response.json();

    const result = [];
    for (const point of json.Points) {
      const [id, type, city, name, right_gk4, up_gk4, distance, _, shortcut] =
        point.split("|");

      result.push({
        id,
        city,
        name,
        right_gk4,
        up_gk4,
        distance,
        shortcut,
        raw: point,
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  })
  .get("/departures/:stopId", async (request) => {
    // @ts-ignore
    const { stopId } = request.params;
    // @ts-ignore
    const { limit, time, isArrival, shorttermchanges, mot } = request.query;

    // mot: Tram, CityBus, IntercityBus, SuburbanRailway, Train, Cableway, Ferry, HailedSharedTaxi

    const response = await fetch("https://webapi.vvo-online.de/dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stopId,
        limit: limit || 20,
        time,
        isArrival,
        shorttermchanges,
        mot,
      }),
    });

    const json = await response.json();

    const { Name, Place, Departures } = json;

    const result = [];
    for (const point of Departures) {
      const {
        Id,
        DlId,
        LineName,
        Direction,
        Platform,
        Mot,
        RealTime,
        ScheduledTime,
        State,
        RouteChanges,
        Diva,
        CancelReasons,
      } = point;

      result.push({
        id: Id,
        dlId: DlId,
        line: LineName,
        direction: Direction,
        platform: Platform,
        mot: Mot,
        realTime: parseDate(RealTime),
        scheduledTime: parseDate(ScheduledTime),
        state: State,
        routeChanges: RouteChanges,
        diva: Diva,
        cancelReasons: CancelReasons,
        raw: point,
      });
    }

    return new Response(
      JSON.stringify({
        name: Name,
        city: Place,
        departures: result,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  })
  .all("*", () => new Response("Not Found", { status: 404 }));

addEventListener("fetch", (event) => {
  const sentry = initSentry(event);
  event.respondWith(
    router.handle(event.request).catch((error: unknown) => {
      sentry.captureException(error);
      throw error;
    })
  );
});

/*
addEventListener("scheduled", (event) => {
  const sentry = initSentry(event);

  event.waitUntil(
    handleCron().catch((error: unknown) => {
      sentry.captureException(error);
      throw error;
    })
  );
});*/
