import neo4j from "neo4j-driver";
import dotenv from "dotenv";

dotenv.config();

const {
  NEO4J_URI,
  NEO4J_USER,
  NEO4J_PASSWORD,
  NEO4J_DATABASE
} = process.env;

if (!NEO4J_URI || !NEO4J_USER || !NEO4J_PASSWORD || !NEO4J_DATABASE) {
  throw new Error("Faltan variables de entorno de Neo4j en el archivo .env");
}

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
);

export const getSession = () => {
  return driver.session({
    database: NEO4J_DATABASE
  });
};

export const verifyConnection = async () => {
  await driver.verifyConnectivity();
  console.log("Conexión exitosa a Neo4j");
};

export const closeDriver = async () => {
  await driver.close();
};

export default driver;