"""
A minimal in-memory stand-in for the real Supabase client, just enough to
drive the query chains used in routers/voice.py (select/eq/in_/order/limit
+ execute). Filters are applied for real against the in-memory rows so
tests can express "what's in the table" rather than "what the mock
returns for this specific call".
"""


class FakeResult:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, rows):
        self._rows = list(rows)

    def select(self, *args, **kwargs):
        return self

    def eq(self, field, value):
        self._rows = [r for r in self._rows if r.get(field) == value]
        return self

    def in_(self, field, values):
        self._rows = [r for r in self._rows if r.get(field) in values]
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, n):
        self._rows = self._rows[:n]
        return self

    def execute(self):
        return FakeResult(self._rows)


class FakeSupabase:
    def __init__(self, tables: dict):
        self._tables = tables  # {"profiles": [...], "tokens": [...]}

    def table(self, name):
        return FakeQuery(self._tables.get(name, []))