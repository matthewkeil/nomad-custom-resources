process.env.NODE_ENV = "testing";
module.exports = {
  roots: ["./"],
  preset: "ts-jest",
  testEnvironment: "node"
};
