// measure_memory_usage.mjs

export default {
    async run() {

        const formatMemoryUsage = (data) => `${Math.round(data / 1024 / 1024 * 100) / 100} MB`;

        const memoryData = process.memoryUsage();

        const memoryUsage = {
            rss: `${formatMemoryUsage(memoryData.rss)} -> Resident Set Size`,
            heapTotal: `${formatMemoryUsage(memoryData.heapTotal)} -> Total Heap Allocated`,
            heapUsed: `${formatMemoryUsage(memoryData.heapUsed)} -> Heap Used`,
            external: `${formatMemoryUsage(memoryData.external)} -> External Memory`,
            arrayBuffers: `${formatMemoryUsage(memoryData.arrayBuffers)} -> Array Buffers`,
        };

        console.log("\n");
        console.log("Memory Usage:");
        console.log(memoryUsage);
        console.log("\n");

        return;

    }
}