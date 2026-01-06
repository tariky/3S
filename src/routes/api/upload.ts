import { createFileRoute } from "@tanstack/react-router";
import { handleRequest, route, type Router } from "@better-upload/server";
import { custom } from "@better-upload/server/clients";
import { nanoid } from "nanoid";

const s3 = custom({
  host: process.env.S3_HOST!,
  accessKeyId: process.env.S3_ACCESS_KEY!,
  secretAccessKey: process.env.S3_SECRET_KEY!,
  region: process.env.S3_REGION!,
  secure: true,
  forcePathStyle: false,
});

const router: Router = {
  client: s3, // or cloudflare(), backblaze(), tigris(), ...
  bucketName: process.env.S3_BUCKET_NAME!,
  routes: {
    images: route({
      fileTypes: ["image/*"],
      multipleFiles: true,
      maxFiles: 4,
      onBeforeUpload: async () => {
        return {
          generateObjectInfo: async ({ file }) => {
            return {
              key: `${nanoid(5)}-${file.name}`,
              metadata: {},
              acl: "public-read",
            };
          },
        };
      },
      onAfterSignedUrl: async ({ files }) => {
        // Construct public URLs using objectInfo. key
        const publicUrls = files.map(
          (file) =>
            `https://${process.env.S3_BUCKET_NAME!}.${process.env.S3_HOST}/${file.objectInfo.key}`
        );

        return {
          metadata: {
            publicUrls,
          },
        };
      },
    }),
  },
};

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return handleRequest(request, router);
      },
    },
  },
});
