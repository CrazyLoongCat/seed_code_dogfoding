#!/usr/bin/env python3
"""
智能CSV数据质量诊断与修复引擎
Smart CSV Data Quality Diagnosis and Repair Engine
"""

import argparse
import csv
import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False


DATE_FORMATS = [
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%d-%m-%Y",
    "%d/%m/%Y",
    "%m-%d-%Y",
    "%m/%d/%Y",
    "%Y-%m-%d %H:%M:%S",
    "%Y/%m/%d %H:%M:%S",
    "%d-%m-%Y %H:%M:%S",
    "%d/%m/%Y %H:%M:%S",
    "%m-%d-%Y %H:%M:%S",
    "%m/%d/%Y %H:%M:%S",
    "%Y%m%d",
    "%d%m%Y",
    "%m%d%Y",
]

EMAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
)

BOOL_VALUES = {
    "true": True, "false": False,
    "yes": True, "no": False,
    "1": True, "0": False,
    "t": True, "f": False,
    "y": True, "n": False,
}


class CSVQualityEngine:
    def __init__(
        self,
        input_path: str,
        output_dir: str = ".",
        no_fix: bool = False,
        rules_path: Optional[str] = None,
        verbose: bool = False,
    ):
        self.input_path = input_path
        self.output_dir = output_dir
        self.no_fix = no_fix
        self.rules_path = rules_path
        self.verbose = verbose

        self.df: Optional[pd.DataFrame] = None
        self.original_df: Optional[pd.DataFrame] = None
        self.column_types: Dict[str, str] = {}
        self.detected_issues: Dict[str, Any] = defaultdict(dict)
        self.repair_actions: List[Dict[str, Any]] = []
        self.rules: Dict[str, Any] = {}
        self.quality_score: float = 0.0

        os.makedirs(output_dir, exist_ok=True)

    def log(self, message: str, level: str = "info"):
        if self.verbose or level in ("error", "warning"):
            print(f"[{level.upper()}] {message}")

    def load_rules(self) -> None:
        if not self.rules_path:
            return
        if not YAML_AVAILABLE:
            self.log("PyYAML not available, skipping rules file", "warning")
            return
        try:
            with open(self.rules_path, "r", encoding="utf-8") as f:
                self.rules = yaml.safe_load(f) or {}
            self.log(f"Loaded rules from {self.rules_path}")
        except Exception as e:
            self.log(f"Failed to load rules: {e}", "error")

    def _detect_encoding(self) -> str:
        encodings = ["utf-8-sig", "utf-8", "gbk", "cp936", "gb2312", "latin-1"]
        for enc in encodings:
            try:
                with open(self.input_path, "r", encoding=enc) as f:
                    f.read(10000)
                return enc
            except (UnicodeDecodeError, UnicodeError):
                continue
        return "utf-8"

    def _analyze_csv_structure(self, encoding: str) -> Tuple[List[str], List[List[str]], List[int]]:
        with open(self.input_path, "r", encoding=encoding, newline="") as f:
            reader = csv.reader(f)
            header = next(reader)
            num_fields = len(header)
            rows = []
            bad_lines = []
            for line_num, row in enumerate(reader, start=2):
                if len(row) == num_fields:
                    rows.append(row)
                elif len(row) > num_fields:
                    merged = row[:num_fields - 1] + [",".join(row[num_fields - 1:])]
                    rows.append(merged)
                    bad_lines.append(line_num)
                else:
                    padded = row + [""] * (num_fields - len(row))
                    rows.append(padded)
                    bad_lines.append(line_num)
            return header, rows, bad_lines

    def _read_csv_robust(self, encoding: str) -> pd.DataFrame:
        try:
            df = pd.read_csv(
                self.input_path, dtype=str, keep_default_na=False,
                encoding=encoding, on_bad_lines="error"
            )
            return df
        except Exception:
            self.log("CSV has formatting issues, using robust parsing", "warning")
            header, rows, bad_lines = self._analyze_csv_structure(encoding)
            if bad_lines:
                self.log(f"Fixed {len(bad_lines)} malformed lines: {bad_lines[:10]}", "warning")
                if len(bad_lines) > 10:
                    self.log(f"... and {len(bad_lines) - 10} more", "warning")
            df = pd.DataFrame(rows, columns=header)
            df = df.astype(str)
            return df

    def read_csv(self) -> None:
        self.log(f"Reading CSV file: {self.input_path}")
        encoding = self._detect_encoding()
        self.log(f"Detected encoding: {encoding}")
        try:
            file_size = os.path.getsize(self.input_path)
            if file_size > 100 * 1024 * 1024:
                self.log("Large file detected, using chunked reading", "warning")
                self.df = self._read_csv_chunked(encoding=encoding)
            else:
                self.df = self._read_csv_robust(encoding=encoding)
            self.original_df = self.df.copy()
            self.log(f"Loaded {len(self.df)} rows, {len(self.df.columns)} columns")
        except Exception as e:
            self.log(f"Failed to read CSV: {e}", "error")
            raise

    def _read_csv_chunked(self, chunksize: int = 10000, encoding: str = "utf-8") -> pd.DataFrame:
        chunks = []
        try:
            for chunk in pd.read_csv(
                self.input_path, dtype=str, keep_default_na=False,
                chunksize=chunksize, encoding=encoding, on_bad_lines="warn"
            ):
                chunks.append(chunk)
            return pd.concat(chunks, ignore_index=True)
        except Exception as e:
            self.log(f"Chunked read failed: {e}, reading entire file with robust parsing", "warning")
            return self._read_csv_robust(encoding=encoding)

    def _try_parse_int(self, value: str) -> Optional[int]:
        if not value:
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None

    def _try_parse_float(self, value: str) -> Optional[float]:
        if not value:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    def _try_parse_date(self, value: str) -> Optional[datetime]:
        if not value:
            return None
        for fmt in DATE_FORMATS:
            try:
                return datetime.strptime(value.strip(), fmt)
            except (ValueError, TypeError):
                continue
        return None

    def _try_parse_bool(self, value: str) -> Optional[bool]:
        if not value:
            return None
        return BOOL_VALUES.get(value.strip().lower())

    def infer_column_type(self, column: pd.Series) -> str:
        sample_size = min(100, len(column))
        sample = column.head(sample_size)
        non_empty = sample[sample != ""].dropna()

        if len(non_empty) == 0:
            return "str"

        type_counts = {"int": 0, "float": 0, "datetime": 0, "bool": 0, "str": 0}

        for value in non_empty:
            if self._try_parse_int(str(value)) is not None:
                type_counts["int"] += 1
            if self._try_parse_float(str(value)) is not None:
                type_counts["float"] += 1
            if self._try_parse_date(str(value)) is not None:
                type_counts["datetime"] += 1
            if self._try_parse_bool(str(value)) is not None:
                type_counts["bool"] += 1
            type_counts["str"] += 1

        total = len(non_empty)
        thresholds = {"int": 0.9, "float": 0.9, "datetime": 0.9, "bool": 0.9}

        for t in ["int", "bool", "datetime", "float"]:
            if type_counts[t] / total >= thresholds[t]:
                if t == "float" and type_counts["int"] / total >= thresholds["int"]:
                    return "int"
                return t

        return "str"

    def infer_types(self) -> None:
        self.log("Inferring column types...")
        for col in self.df.columns:
            if "columns" in self.rules and col in self.rules["columns"]:
                rule_type = self.rules["columns"][col].get("type")
                if rule_type:
                    self.column_types[col] = rule_type
                    self.log(f"Column {col}: using rule type '{rule_type}'")
                    continue
            inferred_type = self.infer_column_type(self.df[col])
            self.column_types[col] = inferred_type
            self.log(f"Column {col}: inferred type '{inferred_type}'")

    def _to_numeric(self, series: pd.Series) -> pd.Series:
        return pd.to_numeric(series.replace("", np.nan), errors="coerce")

    def _to_datetime(self, series: pd.Series) -> pd.Series:
        result = []
        for val in series:
            if pd.isna(val) or val == "":
                result.append(pd.NaT)
            else:
                parsed = self._try_parse_date(str(val))
                result.append(parsed if parsed else pd.NaT)
        return pd.Series(result, index=series.index)

    def check_missing_values(self) -> None:
        self.log("Checking missing values...")
        missing_stats = {}
        for col in self.df.columns:
            missing_mask = (self.df[col] == "") | (self.df[col].isna())
            count = missing_mask.sum()
            percentage = (count / len(self.df)) * 100 if len(self.df) > 0 else 0
            missing_stats[col] = {
                "count": int(count),
                "percentage": round(percentage, 2),
            }
        self.detected_issues["missing_values"] = missing_stats

    def check_outliers(self) -> None:
        self.log("Checking outliers...")
        outlier_stats = {}
        for col in self.df.columns:
            col_type = self.column_types.get(col)
            if col_type not in ("int", "float"):
                continue

            numeric_series = self._to_numeric(self.df[col])
            clean_series = numeric_series.dropna()
            if len(clean_series) < 4:
                continue

            q1 = clean_series.quantile(0.25)
            q3 = clean_series.quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr

            outlier_mask = (numeric_series < lower_bound) | (numeric_series > upper_bound)
            outlier_count = int(outlier_mask.sum())

            z_scores = (clean_series - clean_series.mean()) / clean_series.std()
            z_outliers = int((abs(z_scores) > 3).sum())

            outlier_stats[col] = {
                "iqr_lower_bound": float(lower_bound),
                "iqr_upper_bound": float(upper_bound),
                "iqr_outlier_count": outlier_count,
                "zscore_outlier_count": z_outliers,
                "outlier_indices": self.df.index[outlier_mask].tolist()[:20],
            }
        self.detected_issues["outliers"] = outlier_stats

    def check_format_consistency(self) -> None:
        self.log("Checking format consistency...")
        format_stats = {}

        for col in self.df.columns:
            col_type = self.column_types.get(col)
            col_rules = self.rules.get("columns", {}).get(col, {})
            non_empty = self.df[col][(self.df[col] != "") & (~self.df[col].isna())]

            if len(non_empty) == 0:
                continue

            stats = {"consistent": True, "inconsistent_count": 0, "issues": []}

            if col_type == "datetime":
                format_counts: Counter = Counter()
                for val in non_empty:
                    parsed = self._try_parse_date(str(val))
                    if parsed:
                        for fmt in DATE_FORMATS:
                            try:
                                if datetime.strptime(str(val).strip(), fmt) == parsed:
                                    format_counts[fmt] += 1
                                    break
                            except ValueError:
                                continue
                if len(format_counts) > 1:
                    stats["consistent"] = False
                    stats["formats"] = dict(format_counts)
                    stats["inconsistent_count"] = len(non_empty) - max(format_counts.values())

            email_pattern = col_rules.get("format") == "email"
            if email_pattern or ("email" in col.lower()):
                invalid_emails = []
                for idx, val in zip(non_empty.index, non_empty):
                    if not EMAIL_REGEX.match(str(val).strip()):
                        invalid_emails.append(int(idx))
                if invalid_emails:
                    stats["consistent"] = False
                    stats["inconsistent_count"] = len(invalid_emails)
                    stats["invalid_email_indices"] = invalid_emails[:20]

            if "regex" in col_rules:
                pattern = re.compile(col_rules["regex"])
                invalid_indices = []
                for idx, val in zip(non_empty.index, non_empty):
                    if not pattern.match(str(val).strip()):
                        invalid_indices.append(int(idx))
                if invalid_indices:
                    stats["consistent"] = False
                    stats["inconsistent_count"] = len(invalid_indices)
                    stats["invalid_regex_indices"] = invalid_indices[:20]

            if not stats["consistent"]:
                format_stats[col] = stats

        self.detected_issues["format_inconsistencies"] = format_stats

    def check_duplicates(self) -> None:
        self.log("Checking duplicate rows...")
        dup_mask = self.df.duplicated()
        dup_count = int(dup_mask.sum())
        dup_indices = self.df.index[dup_mask].tolist()

        self.detected_issues["duplicates"] = {
            "count": dup_count,
            "percentage": round((dup_count / len(self.df)) * 100, 2) if len(self.df) > 0 else 0,
            "duplicate_indices": dup_indices[:20],
        }

    def check_cross_column_rules(self) -> None:
        self.log("Checking cross-column rules...")
        violations = []

        cross_rules = self.rules.get("cross_column_rules", [])
        if not cross_rules:
            for col in self.df.columns:
                if "start" in col.lower() or "begin" in col.lower():
                    for col2 in self.df.columns:
                        if col != col2 and ("end" in col2.lower() or "finish" in col2.lower()):
                            cross_rules.append({
                                "expression": f"`{col}` <= `{col2}`",
                                "description": f"{col} should not be later than {col2}",
                            })

        for rule in cross_rules:
            expr = rule.get("expression", "")
            desc = rule.get("description", expr)
            try:
                eval_df = self.df.copy()
                for col in eval_df.columns:
                    if self.column_types.get(col) in ("int", "float"):
                        eval_df[col] = self._to_numeric(eval_df[col])
                    elif self.column_types.get(col) == "datetime":
                        eval_df[col] = self._to_datetime(eval_df[col])

                result = eval_df.eval(expr)
                if isinstance(result, pd.Series):
                    violation_mask = ~result.fillna(True)
                    violation_indices = self.df.index[violation_mask].tolist()
                    if violation_indices:
                        violations.append({
                            "description": desc,
                            "expression": expr,
                            "violation_count": len(violation_indices),
                            "violation_indices": violation_indices[:20],
                        })
            except Exception as e:
                self.log(f"Failed to evaluate rule '{expr}': {e}", "warning")

        self.detected_issues["cross_column_violations"] = violations

    def run_all_checks(self) -> None:
        self.check_missing_values()
        self.check_outliers()
        self.check_format_consistency()
        self.check_duplicates()
        self.check_cross_column_rules()

    def fix_missing_values(self) -> None:
        for col in self.df.columns:
            missing_mask = (self.df[col] == "") | (self.df[col].isna())
            missing_count = int(missing_mask.sum())
            if missing_count == 0:
                continue

            col_type = self.column_types.get(col, "str")
            fill_value = None
            method = None

            if col_type in ("int", "float"):
                numeric_series = self._to_numeric(self.df[col])
                fill_value = numeric_series.median()
                method = "median"
            elif col_type == "datetime":
                method = "ffill"
            else:
                non_empty = self.df[col][self.df[col] != ""]
                if len(non_empty) > 0:
                    fill_value = non_empty.mode().iloc[0]
                else:
                    fill_value = ""
                method = "mode"

            if method == "ffill":
                self.df[col] = self.df[col].replace("", np.nan).ffill().fillna("").astype(str)
            elif fill_value is not None:
                if col_type in ("int", "float"):
                    str_fill = str(int(fill_value)) if col_type == "int" else str(fill_value)
                    self.df.loc[missing_mask, col] = str_fill
                else:
                    self.df.loc[missing_mask, col] = str(fill_value)

            self.repair_actions.append({
                "action": "fill_missing",
                "column": col,
                "count": missing_count,
                "method": method,
                "fill_value": str(fill_value) if fill_value is not None else "ffill",
            })
            self.log(f"Filled {missing_count} missing values in '{col}' using {method}")

    def fix_outliers(self) -> None:
        outliers = self.detected_issues.get("outliers", {})
        for col, stats in outliers.items():
            col_type = self.column_types.get(col)
            if col_type not in ("int", "float"):
                continue

            numeric_series = self._to_numeric(self.df[col])
            lower = stats["iqr_lower_bound"]
            upper = stats["iqr_upper_bound"]

            capped = numeric_series.clip(lower=lower, upper=upper)
            changed_mask = numeric_series != capped
            changed_count = int(changed_mask.sum())

            if changed_count == 0:
                continue

            for idx in self.df.index[changed_mask]:
                val = capped.iloc[idx]
                if col_type == "int":
                    self.df.iloc[idx, self.df.columns.get_loc(col)] = str(int(val))
                else:
                    self.df.iloc[idx, self.df.columns.get_loc(col)] = str(val)

            self.repair_actions.append({
                "action": "cap_outliers",
                "column": col,
                "count": changed_count,
                "lower_bound": lower,
                "upper_bound": upper,
            })
            self.log(f"Capped {changed_count} outliers in '{col}'")

    def fix_format_inconsistencies(self) -> None:
        format_issues = self.detected_issues.get("format_inconsistencies", {})
        for col, stats in format_issues.items():
            col_type = self.column_types.get(col)

            if col_type == "datetime" and "formats" in stats:
                formats = stats["formats"]
                target_format = max(formats, key=formats.get)
                fixed_count = 0

                for idx in self.df.index:
                    val = self.df.iloc[idx, self.df.columns.get_loc(col)]
                    if pd.isna(val) or val == "":
                        continue
                    parsed = self._try_parse_date(str(val))
                    if parsed:
                        new_val = parsed.strftime(target_format)
                        if new_val != str(val):
                            self.df.iloc[idx, self.df.columns.get_loc(col)] = new_val
                            fixed_count += 1

                if fixed_count > 0:
                    self.repair_actions.append({
                        "action": "standardize_date_format",
                        "column": col,
                        "count": fixed_count,
                        "target_format": target_format,
                    })
                    self.log(f"Standardized {fixed_count} dates in '{col}' to {target_format}")

            if "invalid_email_indices" in stats:
                for idx in stats["invalid_email_indices"]:
                    if idx < len(self.df):
                        self.df.iloc[idx, self.df.columns.get_loc(col)] = ""
                self.repair_actions.append({
                    "action": "mark_invalid_emails",
                    "column": col,
                    "count": len(stats["invalid_email_indices"]),
                })
                self.log(f"Marked {len(stats['invalid_email_indices'])} invalid emails in '{col}'")

    def fix_duplicates(self) -> None:
        dup_info = self.detected_issues.get("duplicates", {})
        dup_count = dup_info.get("count", 0)
        if dup_count == 0:
            return

        original_len = len(self.df)
        self.df = self.df.drop_duplicates(keep="first").reset_index(drop=True)
        removed = original_len - len(self.df)

        if removed > 0:
            self.repair_actions.append({
                "action": "remove_duplicates",
                "count": removed,
            })
            self.log(f"Removed {removed} duplicate rows")

    def run_all_fixes(self) -> None:
        if self.no_fix:
            self.log("Fixes disabled (--no-fix)")
            return

        self.log("Applying repairs...")
        self.fix_missing_values()
        self.fix_outliers()
        self.fix_format_inconsistencies()
        self.fix_duplicates()

    def calculate_quality_score(self) -> float:
        score = 100.0
        total_rows = len(self.original_df) if self.original_df is not None else 1
        total_cols = len(self.df.columns) if self.df is not None else 1

        missing = self.detected_issues.get("missing_values", {})
        total_missing = sum(v["count"] for v in missing.values())
        missing_penalty = (total_missing / (total_rows * total_cols)) * 30 if total_rows > 0 and total_cols > 0 else 0
        score -= min(missing_penalty, 30)

        outliers = self.detected_issues.get("outliers", {})
        total_outliers = sum(v["iqr_outlier_count"] for v in outliers.values())
        outlier_penalty = (total_outliers / (total_rows * total_cols)) * 20 if total_rows > 0 and total_cols > 0 else 0
        score -= min(outlier_penalty, 20)

        format_issues = self.detected_issues.get("format_inconsistencies", {})
        total_format = sum(v.get("inconsistent_count", 0) for v in format_issues.values())
        format_penalty = (total_format / (total_rows * total_cols)) * 20 if total_rows > 0 and total_cols > 0 else 0
        score -= min(format_penalty, 20)

        dup_info = self.detected_issues.get("duplicates", {})
        dup_count = dup_info.get("count", 0)
        dup_penalty = (dup_count / total_rows) * 20 if total_rows > 0 else 0
        score -= min(dup_penalty, 20)

        cross_violations = self.detected_issues.get("cross_column_violations", [])
        total_cross = sum(v.get("violation_count", 0) for v in cross_violations)
        cross_penalty = (total_cross / total_rows) * 10 if total_rows > 0 else 0
        score -= min(cross_penalty, 10)

        self.quality_score = max(0.0, round(score, 2))
        return self.quality_score

    def generate_report(self) -> Dict[str, Any]:
        self.calculate_quality_score()

        input_basename = os.path.basename(self.input_path)

        report = {
            "input_file": self.input_path,
            "output_file": os.path.join(self.output_dir, input_basename.replace(".csv", "_fixed.csv")),
            "report_file": os.path.join(self.output_dir, input_basename.replace(".csv", "_quality_report.json")),
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_rows": int(len(self.original_df)) if self.original_df is not None else 0,
                "total_columns": int(len(self.df.columns)),
                "column_types": self.column_types,
                "quality_score": self.quality_score,
                "fixes_applied": not self.no_fix,
                "rows_after_fix": int(len(self.df)),
            },
            "detected_issues": dict(self.detected_issues),
            "repair_actions": self.repair_actions,
        }

        return report

    def save_outputs(self) -> None:
        input_basename = os.path.basename(self.input_path)
        base_name = input_basename.replace(".csv", "")

        fixed_csv_path = os.path.join(self.output_dir, f"{base_name}_fixed.csv")
        report_path = os.path.join(self.output_dir, f"{base_name}_quality_report.json")

        self.df.to_csv(fixed_csv_path, index=False, encoding="utf-8-sig")
        self.log(f"Saved fixed CSV to {fixed_csv_path}")

        report = self.generate_report()
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False, default=str)
        self.log(f"Saved quality report to {report_path}")

        print(f"\n=== Quality Score: {self.quality_score}/100 ===")
        print(f"Fixed CSV: {fixed_csv_path}")
        print(f"Quality Report: {report_path}")

    def run(self) -> None:
        self.load_rules()
        self.read_csv()
        self.infer_types()
        self.run_all_checks()
        self.run_all_fixes()
        self.save_outputs()


def main():
    parser = argparse.ArgumentParser(
        description="智能CSV数据质量诊断与修复引擎 - Smart CSV Data Quality Diagnosis and Repair Engine"
    )
    parser.add_argument("--input", required=True, help="Input CSV file path")
    parser.add_argument("--output-dir", default=".", help="Output directory (default: current directory)")
    parser.add_argument("--no-fix", action="store_true", help="Only detect issues, do not fix")
    parser.add_argument("--rules", help="Path to YAML rules file")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")

    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"Error: Input file '{args.input}' not found")
        sys.exit(1)

    engine = CSVQualityEngine(
        input_path=args.input,
        output_dir=args.output_dir,
        no_fix=args.no_fix,
        rules_path=args.rules,
        verbose=args.verbose,
    )

    try:
        engine.run()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
