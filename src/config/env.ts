export const env = {
  ticketmasterApiKey: import.meta.env.VITE_TICKETMASTER_API_KEY as string,
  bandsintownAppId: import.meta.env.VITE_BANDSINTOWN_APP_ID as string,
  predictHQToken: import.meta.env.VITE_PREDICTHQ_TOKEN as string,
} as const;
