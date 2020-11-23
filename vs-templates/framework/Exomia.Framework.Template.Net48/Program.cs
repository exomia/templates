namespace $safeprojectname$
{
    /// <summary>
    ///     A program. This class cannot be inherited.
    /// </summary>
    sealed class Program
    {
        /// <summary>
        ///     Main entry-point for this application.
        /// </summary>
        private static void Main()
        {
            using(MyGame game = new MyGame())
			{
				game.Run();
			}
        }
    }
}