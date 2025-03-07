import {
  fetchAbfahrten,
  useAbfahrtenDepartures,
  useCurrentAbfahrtenStopPlace,
  useRawAbfahrten,
} from 'client/Abfahrten/provider/AbfahrtenProvider';
import {
  useAbfahrtenConfig,
  useAbfahrtenFetchAPIUrl,
  useAbfahrtenFilter,
} from 'client/Abfahrten/provider/AbfahrtenConfigProvider';
import { useCallback, useMemo } from 'react';
import type { Abfahrt } from 'types/iris';

function sortAbfahrtenByTime(a: Abfahrt, b: Abfahrt) {
  const aTime = (a.departure?.time || a.arrival?.time)!;
  const bTime = (b.departure?.time || b.arrival?.time)!;
  return aTime > bTime ? 1 : -1;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useAbfahrten = () => {
  const departures = useAbfahrtenDepartures();
  const { showCancelled, sortByTime } = useAbfahrtenConfig();
  const { onlyDepartures, productFilter } = useAbfahrtenFilter();

  return {
    filteredAbfahrten: useMemo(() => {
      if (!departures) return departures;
      const filtered = {
        departures: departures.departures,
        lookbehind: departures.lookbehind,
      };

      const filterFunctions: ((a: Abfahrt) => boolean)[] = [];

      if (productFilter.length) {
        filterFunctions.push(
          (a: Abfahrt) => !productFilter.includes(a.train.type),
        );
      }
      if (onlyDepartures) {
        filterFunctions.push((a: Abfahrt) => Boolean(a.departure));
      }
      if (!showCancelled) {
        filterFunctions.push((a) => !a.cancelled);
      }

      if (filterFunctions.length) {
        const f = (a: Abfahrt) => filterFunctions.every((fn) => fn(a));

        filtered.departures = filtered.departures.filter(f);
        filtered.lookbehind = filtered.lookbehind.filter(f);
      }

      if (sortByTime) {
        filtered.departures = [...filtered.departures].sort(
          sortAbfahrtenByTime,
        );
        filtered.lookbehind = [...filtered.lookbehind].sort(
          sortAbfahrtenByTime,
        );
      }

      return filtered;
    }, [departures, onlyDepartures, productFilter, showCancelled, sortByTime]),
    unfilteredAbfahrten: departures,
  };
};

const defaultTypes = ['ICE', 'IC', 'EC', 'RE', 'RB', 'S'];

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useAllTrainTypes = () => {
  const departures = useAbfahrtenDepartures();

  return useMemo(() => {
    const typeSet = new Set<string>(defaultTypes);

    if (departures) {
      departures.departures.forEach((a) => {
        if (a.train.type) {
          typeSet.add(a.train.type);
        }
      });
      departures.lookbehind.forEach((a) => {
        if (a.train.type) {
          typeSet.add(a.train.type);
        }
      });
    }

    return Array.from(typeSet);
  }, [departures]);
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useRefreshCurrent = (visible = false) => {
  const { setDepartures } = useRawAbfahrten();
  const currentStopPlace = useCurrentAbfahrtenStopPlace();
  const { lookahead, lookbehind } = useAbfahrtenConfig();
  const fetchApiUrl = useAbfahrtenFetchAPIUrl();

  return useCallback(async () => {
    if (currentStopPlace && currentStopPlace.evaNumber) {
      if (visible) {
        setDepartures(undefined);
      }
      const r = await fetchAbfahrten(
        `${fetchApiUrl}/${currentStopPlace.evaNumber}`,
        lookahead,
        lookbehind,
      );

      if (r) {
        setDepartures(r);
      }
    }
  }, [
    currentStopPlace,
    fetchApiUrl,
    lookahead,
    lookbehind,
    setDepartures,
    visible,
  ]);
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const useWings = (abfahrt: Abfahrt) => {
  const departures = useAbfahrtenDepartures();
  const wings = departures && departures.wings;

  return useMemo(() => {
    if (wings) {
      const arrivalWings = abfahrt.arrival && abfahrt.arrival.wingIds;

      if (arrivalWings) {
        return arrivalWings.map((w) => wings[w]).filter(Boolean);
      }
      const departureWings = abfahrt.departure && abfahrt.departure.wingIds;

      if (departureWings) {
        return departureWings.map((w) => wings[w]).filter(Boolean);
      }
    }
  }, [abfahrt.arrival, abfahrt.departure, wings]);
};
