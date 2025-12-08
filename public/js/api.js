export const createAlbumService = () => {
  const fetchAlbums = async (page = 1, mode = "new", tag = "") => {
    const tagParam = tag ? `&tag=${encodeURIComponent(tag)}` : "";
    const response = await fetch(
      `/api/albums?page=${page}&slice=${mode}${tagParam}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  };

  return { fetchAlbums };
};
