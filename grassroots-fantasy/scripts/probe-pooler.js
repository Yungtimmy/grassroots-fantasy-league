const net = require("net");
const tls = require("tls");

const user = "postgres.dxjwkptvkzpommvadpni";
const database = "postgres";
const hosts = [
  "aws-0-eu-west-1.pooler.supabase.com",
  "aws-0-eu-west-2.pooler.supabase.com",
  "aws-0-eu-north-1.pooler.supabase.com",
  "aws-0-eu-central-1.pooler.supabase.com",
  "aws-1-eu-west-1.pooler.supabase.com",
  "aws-1-eu-west-2.pooler.supabase.com",
  "aws-1-eu-central-1.pooler.supabase.com",
  "aws-0-us-east-1.pooler.supabase.com",
  "aws-0-us-east-2.pooler.supabase.com",
  "aws-0-us-west-1.pooler.supabase.com",
  "aws-1-us-east-1.pooler.supabase.com",
  "aws-1-us-east-2.pooler.supabase.com",
  "aws-0-ap-southeast-1.pooler.supabase.com",
  "aws-0-ap-south-1.pooler.supabase.com",
  "aws-0-ap-northeast-1.pooler.supabase.com",
];
const ports = [5432, 6543];

function sslRequest() {
  const b = Buffer.alloc(8);
  b.writeInt32BE(8, 0);
  b.writeInt32BE(80877103, 4);
  return b;
}

function startupMessage() {
  const params = ["user", user, "database", database];
  let body = Buffer.from([0, 3, 0, 0]);
  for (const p of params) body = Buffer.concat([body, Buffer.from(p), Buffer.from([0])]);
  body = Buffer.concat([body, Buffer.from([0])]);
  const len = Buffer.alloc(4);
  len.writeInt32BE(body.length + 4);
  return Buffer.concat([len, body]);
}

function probe(host, port) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port }, () => sock.write(sslRequest()));
    sock.setTimeout(4000, () => {
      sock.destroy();
      resolve("timeout");
    });
    sock.once("data", (d) => {
      const flag = d.toString("utf8", 0, 1);
      if (flag !== "S") {
        sock.destroy();
        return resolve("no-ssl " + flag);
      }
      const tlsSock = tls.connect(
        { socket: sock, servername: host, rejectUnauthorized: false },
        () => tlsSock.write(startupMessage())
      );
      tlsSock.once("data", (buf) => {
        const type = String.fromCharCode(buf[0]);
        const msg = buf.slice(5).toString("utf8").replace(/\0/g, " ").trim().slice(0, 200);
        tlsSock.destroy();
        resolve(`${type} ${msg}`);
      });
      tlsSock.on("error", (e) => resolve("tls " + (e.code || e.message)));
    });
    sock.on("error", (e) => resolve("err " + (e.code || e.message)));
  });
}

(async () => {
  for (const host of hosts) {
    for (const port of ports) {
      const result = await probe(host, port);
      console.log(`${host}:${port} -> ${result}`);
      if (result.startsWith("R") || /password/i.test(result) || /authentication/i.test(result)) {
        console.log("MATCH " + host + " " + port);
      }
    }
  }
})();
