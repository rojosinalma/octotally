// Preloaded by bunfig.toml for every test file: closes the databases a test opened.
import { afterEach } from 'bun:test';
import { closeTestDbs } from './helpers';

afterEach(closeTestDbs);
