const STORAGE_KEY = "garimplay-home-scroll";

type SavedScroll = {
  key: string;
  position: number;
};

export function saveHomeScroll(key: string, position: number) {
  const data: SavedScroll = {
    key,
    position,
  };

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getHomeScroll(key: string): number | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);

    if (!stored) return null;

    const data = JSON.parse(stored) as SavedScroll;

    return data.key === key ? data.position : null;
  } catch {
    return null;
  }
}
