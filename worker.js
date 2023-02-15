const { workerData, parentPort } = require('worker_threads')

let counter = 0
for (let i = 0; i < 500000000000 / workerData.thread_count; i++) {
  counter++
}

parentPort.postMessage(counter)
