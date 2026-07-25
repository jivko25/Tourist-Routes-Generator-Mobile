import React, { createContext, useContext, useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import {
  WORLD_HEIGHT,
  WORLD_LOCATIONS,
  WORLD_VIEW_BOX,
  WORLD_WIDTH,
} from '../../utils/worldCountries';

const MapInteractionContext = createContext({
  visitedIds: [],
  selectedId: null,
  onCountryPress: () => {},
});

const FILL_DEFAULT = '#D6E4F5';
const FILL_VISITED = colors.success;
const FILL_SELECTED = colors.accent;
const STROKE = '#64748B';

function CountryPath({ id, name, d }) {
  const { visitedIds, selectedId, onCountryPress } = useContext(
    MapInteractionContext
  );

  const isVisited = visitedIds.includes(id);
  const isSelected = selectedId === id;

  let fill = FILL_DEFAULT;
  if (isVisited) fill = FILL_VISITED;
  else if (isSelected) fill = FILL_SELECTED;

  return (
    <Path
      d={d}
      id={id}
      fill={fill}
      stroke={STROKE}
      strokeWidth={0.35}
      onPress={() => onCountryPress?.({ id, name, d })}
    />
  );
}

export function WorldMapSvg({ visitedIds = [], selectedId = null, onCountryPress }) {
  const value = useMemo(
    () => ({
      visitedIds,
      selectedId,
      onCountryPress,
    }),
    [visitedIds, selectedId, onCountryPress]
  );

  return (
    <MapInteractionContext.Provider value={value}>
      <Svg
        width="100%"
        height="100%"
        viewBox={WORLD_VIEW_BOX}
        preserveAspectRatio="xMidYMid meet"
      >
        {WORLD_LOCATIONS.map((loc) => (
          <CountryPath
            key={loc.id}
            id={loc.id}
            name={loc.name}
            d={loc.path}
          />
        ))}
      </Svg>
    </MapInteractionContext.Provider>
  );
}

export function CountrySilhouette({ d, transform }) {
  if (!d) return null;
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <Path
        d={d}
        transform={transform}
        fill={FILL_VISITED}
        stroke={STROKE}
        strokeWidth={1}
      />
    </Svg>
  );
}
