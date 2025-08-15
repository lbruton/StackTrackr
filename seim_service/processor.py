import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


def parse_csv(path):
    try:
        df = pd.read_csv(path)
        return df
    except Exception as e:
        print('parse_csv error:', e)
        return None


def compute_summary(df, group_cols=None, time_col=None, top_n=10):
    # Basic computations: counts, sums, top N by count or by a numeric column if present
    result = {}
    if group_cols:
        # support multi-column grouping
        grp = df.groupby(group_cols)
        counts = grp.size().reset_index(name='count')
        counts = counts.sort_values('count', ascending=False).head(top_n)
        result['group_counts'] = counts.to_dict(orient='records')
    else:
        # default: top by any categorical columns
        cat_cols = df.select_dtypes(include=['object']).columns.tolist()
        summary = []
        for col in cat_cols:
            counts = df[col].value_counts().head(top_n)
            summary.append({'column': col, 'counts': counts.to_dict()})
        result['columns'] = summary

    # numeric summaries
    num = df.select_dtypes(include=['number'])
    if not num.empty:
        num_summary = num.describe().to_dict()
        result['numeric_summary'] = num_summary

    # time series if requested
    if time_col and time_col in df.columns:
        try:
            ts = df.copy()
            ts[time_col] = pd.to_datetime(ts[time_col])
            ts = ts.set_index(time_col)
            res = ts.resample('D').size()
            result['timeseries'] = [{'date': str(idx.date()), 'count': int(v)} for idx, v in res.iteritems()]
        except Exception as e:
            print('timeseries error:', e)
            result['timeseries_error'] = str(e)

    return result


def plot_summary(summary, out_path):
    # Very simple plot: if timeseries available, plot it; otherwise plot top group counts
    plt.clf()
    if 'timeseries' in summary and isinstance(summary['timeseries'], list):
        dates = [row['date'] for row in summary['timeseries']]
        counts = [row['count'] for row in summary['timeseries']]
        plt.plot(dates, counts, marker='o')
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.title('Events over time')
        plt.savefig(out_path)
        return

    if 'group_counts' in summary and summary['group_counts']:
        labels = [', '.join([str(v) for v in list(d.values())[:-1]]) for d in summary['group_counts']]
        values = [d['count'] for d in summary['group_counts']]
        plt.bar(labels, values)
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        plt.title('Top groups')
        plt.savefig(out_path)
        return

    if 'columns' in summary and summary['columns']:
        # plot first column top counts
        first = summary['columns'][0]
        labels = list(first['counts'].keys())
        values = list(first['counts'].values())
        plt.bar(labels, values)
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        plt.title(f"Top values for {first['column']}")
        plt.savefig(out_path)
        return

    # fallback: save empty placeholder
    plt.text(0.5, 0.5, 'No data to plot', ha='center')
    plt.savefig(out_path)
