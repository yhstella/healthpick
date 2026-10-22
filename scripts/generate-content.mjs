// The old topic-by-angle factory could overwrite reviewed articles and publish
// unsupported medical templates. Keep the entry point fail-closed for old jobs.
console.error('Legacy template generation and --clean are retired. Existing articles are never changed.');
console.error('For one researched, unpublished draft: npm run draft -- -Topic "A specific health question"');
process.exitCode = 1;
