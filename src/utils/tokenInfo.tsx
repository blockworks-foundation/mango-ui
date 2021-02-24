// Here we get some token infos (mainly the logos for now)
import { useState, useEffect } from 'react';
// Import token info
import tokenmap from './tokenMap';
// Type annotations
import { KnownToken } from './types';

const useTokenInfo = () => {

  const [tokenMap, setTokenMap] = useState<Map<string, KnownToken>>(new Map());
  useEffect(() => {
    // fetch token files
    const knownMints = tokenmap.reduce((map, item) => {
      map.set(item.mintAddress, item);
      return map;
    }, new Map<string, KnownToken>());
    setTokenMap(knownMints);
  }, []);

  return { tokenMap };
}

export default useTokenInfo;