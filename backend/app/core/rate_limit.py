"""Login rate limiting.

Counters live in this process's memory, which is correct for the single
instance this application deploys as. Behind more than one worker each would
keep its own tally and the effective limit would multiply; Redis is the
documented path if that ever changes. See docs/SECURITY.md.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
