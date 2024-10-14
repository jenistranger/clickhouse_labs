import clickhouse_connect
import string
import random

client = clickhouse_connect.get_client(host='localhost', username='default', password='admin', database='grebomas')

def random_b(length):
    letts = string.ascii_lowercase
    return ''.join(random.choice(letts) for _ in range(length))

enum_vals = ['available', 'unavailable', 'unknown']

values = [(i, random_b(10), random.choice(enum_vals)) for i in range(1, 10001)]

client.insert('test', values, column_names=['a', 'b', 'c'])
