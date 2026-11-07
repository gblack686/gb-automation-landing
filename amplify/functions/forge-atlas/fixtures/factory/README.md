# Frozen synthetic factory contracts

These nine small JSON files are frozen outputs from GBAutomation's synthetic
producer tests. `manifest.json` binds each to its original bytes, source commit
and generator. Proposal preparation files retain only the exact field values
used by canonical proposal projection; unrelated copy and code excerpts are
excluded. The remaining files preserve their original bytes.

They let the standard Atlas Node suite run in a clean public checkout without
access to the private producer repository, credentials or live accounts. The
tests still accept explicit fixture directories from a fresh producer run.
Frozen consumer contracts do not prove that today's producer generated these
bytes, production calibration, live traces, hosted acceptance or activation.

To refresh, run the named generators in an approved isolated GBAutomation
checkout, preserve source provenance and original hashes, review the synthetic
scope and public contents, and update this manifest with the selected outputs.
Never copy production captures or private runtime configuration here.
