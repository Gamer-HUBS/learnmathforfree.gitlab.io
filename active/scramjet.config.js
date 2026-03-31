self.__scramjet$config = {
  prefix: "/scramjet/",
  codec: self.__scramjet$codecs.plain,
  config: "/scramjet/scramjet.config.js",
  bundle: "/scramjet/scramjet.bundle.js",
  worker: "/scramjet/scramjet.worker.js",
  client: "/scramjet/scramjet.client.js",
  codecs: "/scramjet/scramjet.codecs.js",
  transport: {
    wisp: (self.location.protocol === "https:" ? "wss://" : "ws://") + self.location.host + "/wisp/",
    bare: (self.location.protocol === "https:" ? "https://" : "http://") + self.location.host + "/bare/",
  },
};
