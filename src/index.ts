// Documentation: https://sdk.netlify.com
import { NetlifyIntegration } from "@netlify/sdk";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

const integration = new NetlifyIntegration();
const connector = integration.addConnector({
  typePrefix: "Example",
  localDevOptions: {
    accessKeyId: process.env.DEMO_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.DEMO_SECRET_ACCESS_KEY ?? "",
    bucketName: process.env.DEMO_BUCKET_NAME ?? "ejs-cool-bucket",
  },
});

connector.defineOptions(({ zod }) =>
  zod.object({
    accessKeyId: zod.string().meta({
      label: "Access Key ID",
      helpText: "The access key ID for your AWS account.",
    }),
    secretAccessKey: zod.string().meta({
      label: "Secret Access Key",
      helpText: "The secret access key for your AWS account.",
    }),
    bucketName: zod.string().meta({
      label: "Bucket Name",
      helpText: "The name of the S3 bucket to fetch data from.",
    }),
  })
);

/**
 * Define your content models here.
 * https://sdk.netlify.com/connectors/connector-apis/#model
 */
connector.model(async ({ define }) => {
  define.nodeModel({
    name: "Book",
    fields: {
      title: {
        type: "String",
        required: true,
      },
      author: {
        type: "String",
        required: true,
      },
      description: {
        type: "String",
        required: true,
      },
      imagePath: {
        type: "String",
        required: true,
      },
      price: {
        type: "String",
        required: true,
      },
      isbn: {
        type: "String",
        required: true,
      },
    },
  });
  define.nodeModel({
    name: "Product",
    fields: {
      name: {
        type: "String",
        required: true,
      },
      description: {
        type: "String",
        required: true,
      },
    },
  });
});

/**
 * Fetch and store data from your API here.
 * https://sdk.netlify.com/connectors/connector-apis/#createallnodes
 */
connector.event(
  "createAllNodes",
  async ({ models }, { accessKeyId, secretAccessKey }) => {
    const client = new S3Client({
      credentials: {
        accessKeyId: accessKeyId as string,
        secretAccessKey: secretAccessKey as string,
      },
      region: "us-east-1",
    });

    const command = new GetObjectCommand({
      Bucket: "ejs-cool-bucket",
      Key: "books.csv",
    });

    try {
      const response = await client.send(command);
      // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
      const str = await response?.Body?.transformToString();

      if (!str) throw new Error("No body");

      const products = str
        .split("\n")
        .filter((line) => line !== "")
        // Skip the header row
        .slice(1)
        .map((line) => {
          const [slug, title, author, description, imagePath, price, isbn] =
            line.split(",");
          return { slug, title, author, description, imagePath, price, isbn };
        });

      products.forEach(({ slug, ...product }, index) => {
        models.Book.create({
          id: slug,
          ...product,
        });
      });
    } catch (err) {
      console.error(err);
    }
  }
);

/**
 * Fetch and store changed data from your API here.
 * https://sdk.netlify.com/connectors/connector-apis/#updatenodes
 */
connector.event("updateNodes", false);

integration.onEnable(async (_, { teamId, siteId, client }) => {
  // Connectors are disabled by default, so we need to
  // enable them when the integration is enabled.

  teamId && (await client.enableConnectors(teamId));

  return {
    statusCode: 200,
  };
});

export { integration };
