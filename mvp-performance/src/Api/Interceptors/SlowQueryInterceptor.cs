using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Api.Interceptors;

public class SlowQueryInterceptor : DbCommandInterceptor
{
    private readonly ILogger<SlowQueryInterceptor> _logger;
    private readonly TimeSpan _threshold = TimeSpan.FromMilliseconds(500);

    public SlowQueryInterceptor(ILogger<SlowQueryInterceptor> logger)
    {
        _logger = logger;
    }

    public override DbDataReader ReaderExecuted(
        DbCommand command,
        CommandExecutedEventData eventData,
        DbDataReader result)
    {
        LogIfSlow(command, eventData);
        return result;
    }

    public override ValueTask<DbDataReader> ReaderExecutedAsync(
        DbCommand command,
        CommandExecutedEventData eventData,
        DbDataReader result,
        CancellationToken cancellationToken = default)
    {
        LogIfSlow(command, eventData);
        return ValueTask.FromResult(result);
    }

    public override int NonQueryExecuted(
        DbCommand command,
        CommandExecutedEventData eventData,
        int result)
    {
        LogIfSlow(command, eventData);
        return result;
    }

    private void LogIfSlow(DbCommand command, CommandExecutedEventData eventData)
    {
        if (eventData.Duration > _threshold)
        {
            _logger.LogWarning(
                "SLOW QUERY ({DurationMs}ms): {CommandText}",
                eventData.Duration.TotalMilliseconds,
                command.CommandText);
        }
    }
}
