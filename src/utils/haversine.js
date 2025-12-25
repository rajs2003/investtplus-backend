const toRadians = (degree) => {
  return degree * (Math.PI / 180);
};

const haversine = (point1, point2) => {
  const R = 6371; // Radius of the Earth in kilometers

  const lat1 = point1.lat;
  const lon1 = point1.lon;
  const lat2 = point2.lat;
  const lon2 = point2.lon;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in kilometers
  return distance;
};

module.exports = haversine;
