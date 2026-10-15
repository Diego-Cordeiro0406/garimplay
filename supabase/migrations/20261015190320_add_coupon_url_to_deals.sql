ALTER TABLE public.deals
ADD COLUMN coupon_url TEXT;

ALTER TABLE public.deals
ADD CONSTRAINT deals_coupon_exclusive_check
CHECK (
  coupon_code IS NULL
  OR coupon_url IS NULL
);