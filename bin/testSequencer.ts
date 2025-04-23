import Sequencer from '@jest/test-sequencer'
import { Test } from '@jest/test-result';

class CustomSequencer extends Sequencer {
    sort(tests : Array<Test>) {
        const copyTests = Array.from(tests);
        return copyTests.sort((testA, testB) => (testA.path > testB.path ? 1 : -1));
    }
}

module.exports = CustomSequencer