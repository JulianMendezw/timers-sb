import { useCallback, useEffect, useMemo, useState } from 'react';
import { getProductionDay, getProductionDayId, getLotCode, getProductionDayTimestamp } from '../utils/productionDay';

export type UseProductionDay = {
  productionDay: Date;
  productionDayId: string;
  lotCode: string;
  getSampledAt: (hour: number) => string;
};

export function useProductionDay(): UseProductionDay {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const productionDay = useMemo(() => getProductionDay(now), [now]);
  const productionDayId = useMemo(() => getProductionDayId(now), [now]);
  const lotCode = useMemo(() => getLotCode(productionDay), [productionDay]);

  const getSampledAt = useCallback(
    (hour: number) => getProductionDayTimestamp(hour, productionDay),
    [productionDay]
  );

  return { productionDay, productionDayId, lotCode, getSampledAt };
}
