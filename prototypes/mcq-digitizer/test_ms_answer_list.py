"""parse_ms_answer_list: a plain "N. X" answer key is read completely; anything that is not clearly a plain key is left to the other parsers."""
import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import extract_mcq as em


def lines(*texts):
    return [{"text": t, "page": 1, "y0": 50 + 10 * i, "x0": 187} for i, t in enumerate(texts)]


class AnswerList(unittest.TestCase):
    def test_reads_every_question_including_2_and_3(self):
        got, ok = em.parse_ms_answer_list(lines(*[f"{i}. {'ABCD'[i % 4]} " for i in range(1, 9)]))
        self.assertTrue(ok)
        self.assertEqual(sorted(got, key=int), [str(i) for i in range(1, 9)])
        self.assertEqual(got["2"], "C")

    def test_bracket_form_is_accepted(self):
        got, ok = em.parse_ms_answer_list(lines(*[f"{i}) A" for i in range(1, 7)]))
        self.assertTrue(ok and len(got) == 6)

    def test_a_gap_in_the_numbers_is_not_a_plain_key(self):
        self.assertEqual(em.parse_ms_answer_list(lines("1. A", "2. B", "4. C", "5. D", "6. A", "7. B")), (None, False))

    def test_a_repeated_number_is_not_a_plain_key(self):
        self.assertEqual(em.parse_ms_answer_list(lines("1. A", "2. B", "3. C", "3. D", "4. A", "5. B")), (None, False))

    def test_too_few_lines_is_not_a_key(self):
        self.assertEqual(em.parse_ms_answer_list(lines("1. A", "2. B", "3. C")), (None, False))

    def test_prose_lines_do_not_count(self):
        self.assertEqual(em.parse_ms_answer_list(lines(*[f"{i}. A is incorrect because ..." for i in range(1, 9)])), (None, False))


if __name__ == "__main__":
    unittest.main()
