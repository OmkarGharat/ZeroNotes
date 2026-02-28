import { DocCollection, Schema } from '@blocksuite/store';
import { AffineSchemas } from '@blocksuite/blocks';

async function run() {
    const schema = new Schema().register(AffineSchemas);
    const collection = new DocCollection({ schema });
    console.log("Blob keys:", Object.keys(collection).filter(k => k.toLowerCase().includes('blob')));
    const blobSync = collection.blobSync;
    if (blobSync) {
        console.log("BlobSync keys:", Object.keys(blobSync));
    }
}
run();
