import {assert} from './assertion';
import {assertionMessage, endTestMessage, startTestMessage} from './protocol';
import {tapeTapLike as tap} from './reporter';
import {counter, delegateToCounter} from './counter';
import {TestHarness, Test} from './interfaces';

export const harnessFactory = (): TestHarness => {
    const tests: Test[] = [];
    const testCounter = counter();
    const withTestCounter = delegateToCounter(testCounter);
    const rootOffset = 0;
    const collect = item => tests.push(item);
    const api = assert(collect, rootOffset);

    let pass = true;
    let id = 0;

    const instance = Object.create(api, {
        length: {
            get() {
                return tests.length;
            }
        },
        pass: {
            get() {
                return pass;
            }
        }
    });

    return withTestCounter(Object.assign(instance, {
        [Symbol.asyncIterator]: async function* () {
            for (const t of tests) {
                t.id = ++id;
                if (t[Symbol.asyncIterator]) {
                    // Sub test
                    yield startTestMessage({description: t.description}, rootOffset);
                    yield* t;
                    if (t.error !== null) {
                        pass = false;
                        return;
                    }
                }
                yield assertionMessage(t, rootOffset);
                pass = pass && t.pass;
                testCounter.update(t);
            }
            yield endTestMessage(this, 0);
        },
        report: async (reporter = tap) => {
            return reporter(instance);
        }
    }));
};
