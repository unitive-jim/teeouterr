const Deque = require('double-ended-queue');
const P = require('bluebird');

class BufferedWritable {
  constructor(writableStream) {
    this.stream = writableStream;
    this.flowing = true;
    this.pauses = 0;
    this.deque = new Deque();

    // This is null until finish() is called, at which point it is a resolve function, to be called
    // from `drain()` when all buffered data has been written
    this.finished = null;
  }

  // A synchronous function that hands off a chunk of data to be written to the writableStream.
  // Under normal conditions, the data is written immediately, but if necessary the data will be buffered.
  // The data buffer/string is now owned by this class, i.e. the caller must not mutate it.
  write(data) {
    if (this.finished !== null) {
      throw new Error('Cannot call write() after calling finish()');
    }
    if (this.flowing) {
      this._checkedWrite(data);
    } else {
      this.deque.enqueue(data);
    }
  }

  // An asynchronous function returing a promise. The client is declaring that it will not write any more data,
  // and wants to wait until all buffered data has been written.
  finish() {
    return new P(resolve => {
      if (this.deque.isEmpty()) {
        resolve();
      } else {
        this.finished = resolve;
      }
    })
    .then(() => {
      if (this.stream !== process.stdout && this.stream !== process.stderr) {
        const streamEnd = P.promisify(this.stream.end, {context: this.stream});
        return streamEnd();
      }
    })
    .then(() => this.pauses);
  }

  // A private implementation method, called to process `drain` events
  _drain() {
    this.flowing = true;
    while (this.flowing && !this.deque.isEmpty()) {
      const data = this.deque.dequeue();
      this._checkedWrite(data);
    }
    if (this.deque.isEmpty() && this.finished !== null) {
      this.finished();
    }
  }

  // A private implmention method, wrapping `this.stream.write()`
  _checkedWrite(data) {
    const flowing = this.stream.write(data);
    if (!flowing) {
      this.flowing = false;
      ++this.pauses;
      this.stream.once('drain', () => this._drain());
    }
  }

}

module.exports = BufferedWritable;
