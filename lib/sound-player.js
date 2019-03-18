const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const axios = require("axios");
const ytdl = require("ytdl-core");
const asyncPool = require("tiny-async-pool");
const glob = require("glob-promise");
const PlaySound = require("play-sound");

function getUriHash(uri) {
  return crypto
    .createHash("md5")
    .update(uri)
    .digest("hex");
}

const cacheDir = "cache";

class SoundPlayer {
  constructor(config) {
    this.config = config || {
      maxDownloads: 8
    };
    this.cached = glob
      .sync(`${cacheDir}/*.done`)
      .map(file => path.basename(file, ".done"))
      .reduce((previous, current) => {
        previous[current] = "done";
        return previous;
      }, {});

    this.player = new PlaySound();
    this.audioProcesses = [];
  }

  async play(uri) {
    let uriHash = getUriHash(uri);
    if (this.cached[uriHash] === "done") {
      this.audioProcesses.push({
        uri: uri,
        uriHash: uriHash,
        process: this.player.play(`${cacheDir}/${uriHash}.done`)
      });
    }
  }

  stop() {
    this.audioProcesses.forEach(context => context.process.kill());
  }

  async cache(uriJobs) {
    let cacheJobs = uriJobs
      .map(uriJob => {
        return {
          ...uriJob,
          uriHash: getUriHash(uriJob.uri)
        };
      })
      .filter(info => !["pending", "done"].includes(this.cached[info.uriHash]))
      .map(info => {
        return {
          ...info,
          run: async () => {
            const targetPath = `${cacheDir}/${getUriHash(info.uri)}`;
            const writer = fs.createWriteStream(targetPath);

            var stream;
            if (info.uri.includes("youtube")) {
              stream = ytdl(info.uri, { filter: "audioonly" });
            } else {
              let response = await axios({
                url: info.uri,
                method: "GET",
                responseType: "stream"
              });
              stream = response.data;
            }

            stream.pipe(writer);

            let writingJob = new Promise((resolve, reject) => {
              writer.on("finish", resolve);
              writer.on("error", reject);
            });

            return writingJob;
          }
        };
      });

    return asyncPool(this.config.maxDownloads, cacheJobs, async job => {
      this.cached[job.uriHash] = "pending";
      console.log(`caching ${job.uri}`);
      await job.run();
      this.cached[job.uriHash] = "done";
      console.log(`done caching ${job.uri}`);
      fs.renameSync(
        `${cacheDir}/${getUriHash(job.uri)}`,
        `${cacheDir}/${getUriHash(job.uri)}.done`
      );
      job.done();
      return job;
    });
  }

  isCached(uri) {
    let status = this.getCachedStatus(uri);
    return status === "done";
  }

  getCachedStatus(uri) {
    let cacheKey = getUriHash(uri);
    return this.cached[cacheKey];
  }
}

module.exports = {
  SoundPlayer: SoundPlayer
};
